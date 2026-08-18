import { evaluateRule, interpolate, interpolateJson } from './rules.js'
import { safeHttpRequest } from './safeHttpRequest.js'
import type { ExecutionContext, FlowDefinition, FlowNode, RuntimeOption, StepResult } from './types.js'

const MAX_STEPS = 100
const MAX_DELAY_MS = 10_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toMilliseconds(duration: unknown, unit: unknown): number {
  const value = typeof duration === 'number' ? duration : Number(duration)
  if (!Number.isFinite(value) || value <= 0) return 0

  switch (unit) {
    case 'milissegundos':
      return value
    case 'minutos':
      return value * 60_000
    case 'horas':
      return value * 3_600_000
    case 'segundos':
    default:
      return value * 1000
  }
}

function findNode(definition: FlowDefinition, nodeId: string): FlowNode | undefined {
  return definition.nodes.find((n) => n.id === nodeId)
}

function nextNodeId(definition: FlowDefinition, nodeId: string, handle?: string): string | undefined {
  const candidates = definition.edges.filter((e) => e.source === nodeId)
  if (handle) {
    return candidates.find((e) => e.sourceHandle === handle)?.target
  }
  return candidates[0]?.target
}

// Parses a JSON-object config field (headers/query params) after
// interpolating {{variables}} into it. Empty/unset is fine (returns {});
// anything present but malformed is a hard error, not a silent skip.
function parseJsonObjectConfig(
  raw: unknown,
  label: string,
  variables: Record<string, unknown>
): Record<string, string> {
  if (typeof raw !== 'string' || !raw.trim()) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(interpolateJson(raw, variables))
  } catch {
    throw new Error(`${label} inválido: não é um JSON válido`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} inválido: precisa ser um objeto JSON (ex.: {"chave": "valor"})`)
  }

  return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
}

function toOptions(raw: unknown): RuntimeOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, idx) => {
    if (item && typeof item === 'object' && 'label' in item) {
      const label = String((item as Record<string, unknown>).label)
      const value = 'value' in item ? String((item as Record<string, unknown>).value) : label
      return { label, value }
    }
    return { label: String(item), value: String(item) ?? String(idx) }
  })
}

/**
 * Walks a published flow's graph from `context.currentNodeId`, auto-advancing
 * through non-interactive nodes and stopping at the first node that needs a
 * person (question/button) or at the end. `userInput` answers whatever node
 * `context.currentNodeId` is currently waiting on; omit it to start a run.
 */
export async function advance(
  definition: FlowDefinition,
  context: ExecutionContext,
  userInput?: string
): Promise<StepResult> {
  const variables = { ...context.variables }
  const messages: StepResult['messages'] = []
  let currentNodeId: string | undefined = context.currentNodeId ?? undefined

  if (currentNodeId && userInput !== undefined) {
    const waitingNode = findNode(definition, currentNodeId)
    if (!waitingNode || !['question', 'button', 'webhook'].includes(waitingNode.type)) {
      throw new Error('Execution is not waiting for input')
    }
    const variableName = waitingNode.data.config?.variable
    if (typeof variableName === 'string' && variableName) {
      variables[variableName] = userInput
    }
    currentNodeId = nextNodeId(definition, waitingNode.id)
  }

  if (!currentNodeId) {
    const startNode = definition.nodes.find((n) => n.type === 'start')
    if (!startNode) {
      return {
        messages: [{ type: 'system', text: 'Fluxo não tem um nó de Início.' }],
        waitingFor: null,
        finished: true,
        context: { variables, currentNodeId: null },
      }
    }
    currentNodeId = startNode.id
  }

  let steps = 0
  while (currentNodeId && steps < MAX_STEPS) {
    steps++
    const node = findNode(definition, currentNodeId)

    if (!node) {
      messages.push({ type: 'system', text: 'O fluxo chegou a uma conexão inválida.' })
      return { messages, waitingFor: null, finished: true, context: { variables, currentNodeId: null } }
    }

    switch (node.type) {
      case 'start': {
        currentNodeId = nextNodeId(definition, node.id)
        continue
      }
      case 'text': {
        const raw = typeof node.data.config?.message === 'string' ? node.data.config.message : node.data.label
        messages.push({ type: 'text', text: interpolate(raw, variables) })
        currentNodeId = nextNodeId(definition, node.id)
        continue
      }
      case 'variable': {
        const name = node.data.config?.name
        if (typeof name === 'string' && name) {
          variables[name] = node.data.config?.value
        }
        currentNodeId = nextNodeId(definition, node.id)
        continue
      }
      case 'condition': {
        const rule = typeof node.data.config?.rule === 'string' ? node.data.config.rule : undefined
        const branch = evaluateRule(rule, variables) ? 'true' : 'false'
        currentNodeId = nextNodeId(definition, node.id, branch)
        continue
      }
      case 'question': {
        const raw = typeof node.data.config?.question === 'string' ? node.data.config.question : node.data.label
        messages.push({ type: 'question', text: interpolate(raw, variables) })
        return { messages, waitingFor: 'question', finished: false, context: { variables, currentNodeId: node.id } }
      }
      case 'button': {
        const options = toOptions(node.data.config?.buttons)
        messages.push({ type: 'button', text: node.data.label, options })
        return {
          messages,
          waitingFor: 'button',
          options,
          finished: false,
          context: { variables, currentNodeId: node.id },
        }
      }
      case 'webhook': {
        messages.push({ type: 'webhook', text: `Aguardando webhook em "${node.data.label}"...` })
        return {
          messages,
          waitingFor: 'webhook',
          finished: false,
          context: { variables, currentNodeId: node.id },
        }
      }
      case 'end': {
        const raw = typeof node.data.config?.message === 'string' ? node.data.config.message : node.data.label
        messages.push({ type: 'end', text: interpolate(raw, variables) })
        return { messages, waitingFor: null, finished: true, context: { variables, currentNodeId: null } }
      }
      case 'delay': {
        const ms = Math.min(toMilliseconds(node.data.config?.duration, node.data.config?.unit), MAX_DELAY_MS)
        if (ms > 0) await sleep(ms)
        currentNodeId = nextNodeId(definition, node.id)
        continue
      }
      case 'http': {
        const rawUrl = typeof node.data.config?.url === 'string' ? node.data.config.url : undefined
        if (!rawUrl) {
          messages.push({ type: 'system', text: `Nó "${node.data.label}" (http) não tem URL configurada.` })
          return { messages, waitingFor: null, finished: true, context: { variables, currentNodeId: null } }
        }

        const method = typeof node.data.config?.method === 'string' ? node.data.config.method : 'GET'
        const variableName = node.data.config?.variable

        try {
          const headers = parseJsonObjectConfig(node.data.config?.headers, 'Headers', variables)
          const query = parseJsonObjectConfig(node.data.config?.queryParams, 'Query params', variables)
          const body =
            typeof node.data.config?.body === 'string' && node.data.config.body
              ? interpolate(node.data.config.body, variables)
              : undefined
          const result = await safeHttpRequest(interpolate(rawUrl, variables), method, { headers, query, body })
          if (typeof variableName === 'string' && variableName) {
            variables[variableName] = result.body
          }
        } catch (err) {
          messages.push({
            type: 'system',
            text: `Falha ao chamar "${node.data.label}": ${err instanceof Error ? err.message : 'erro desconhecido'}`,
          })
          return { messages, waitingFor: null, finished: true, context: { variables, currentNodeId: null } }
        }

        currentNodeId = nextNodeId(definition, node.id)
        continue
      }
      default:
        messages.push({ type: 'system', text: `Tipo de nó desconhecido: ${node.type}` })
        return { messages, waitingFor: null, finished: true, context: { variables, currentNodeId: null } }
    }
  }

  messages.push({ type: 'system', text: 'O fluxo não chegou a um nó de Fim.' })
  return { messages, waitingFor: null, finished: true, context: { variables, currentNodeId: null } }
}
