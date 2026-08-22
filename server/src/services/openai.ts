import OpenAI from 'openai'
import type { FlowDefinition, FlowNode } from '../models/secretary.js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required but not set in environment')
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const NODE_TYPE_ALLOWLIST = [
  'start',
  'text',
  'question',
  'button',
  'condition',
  'variable',
  'delay',
  'http',
  'webhook',
  'end',
] as const

type NodeType = (typeof NODE_TYPE_ALLOWLIST)[number]

export interface DiscoverResultNeedsInfo {
  status: 'needs_info'
  question: string
}

export interface DiscoverResultComplete {
  status: 'complete'
  profile: {
    businessName: string
    segment: string
    subsegment?: string
    businessModel?: string
    customers: string[]
    products?: string[]
    services?: string[]
    channels: string[]
    departments?: string[]
    businessHours?: unknown
    operationalProcesses?: string[]
    communicationStyle?: string
    restrictions?: string[]
  }
}

export type DiscoverResult = DiscoverResultNeedsInfo | DiscoverResultComplete

const PROFILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['needs_info', 'complete'] },
    question: { type: 'string' },
    profile: {
      type: 'object',
      additionalProperties: false,
      properties: {
        businessName: { type: 'string' },
        segment: { type: 'string' },
        subsegment: { type: 'string' },
        businessModel: { type: 'string' },
        customers: { type: 'array', items: { type: 'string' } },
        products: { type: 'array', items: { type: 'string' } },
        services: { type: 'array', items: { type: 'string' } },
        channels: { type: 'array', items: { type: 'string' } },
        departments: { type: 'array', items: { type: 'string' } },
        businessHours: { type: 'string' },
        operationalProcesses: { type: 'array', items: { type: 'string' } },
        communicationStyle: { type: 'string' },
        restrictions: { type: 'array', items: { type: 'string' } },
      },
      required: ['businessName', 'segment', 'subsegment', 'businessModel', 'customers', 'products', 'services', 'channels', 'departments', 'businessHours', 'operationalProcesses', 'communicationStyle', 'restrictions'],
    },
  },
  required: ['status', 'question', 'profile'],
} as const

const DISCOVER_SYSTEM_PROMPT = `Você é uma assistente de onboarding chamada Secretaria IA. Seu objetivo é extrair o perfil completo de um negócio a partir de uma conversa.

Analise o histórico da conversa. Se você já tem informações suficientes para montar um perfil de negócio completo (nome, segmento, clientes, canais, e pelo menos algumas ofertas ou processos), responda com status "complete" e o perfil.

Se ainda faltam informações importantes, responda com status "needs_info" e faça UMA pergunta objetiva para completar o perfil. Priorize perguntar sobre: tipo de clientes, produtos/serviços oferecidos, canais de atendimento, e processos operacionais.

Limite de 8 turnos: se já tiver o mínimo essencial (businessName, segmento, customers, channels), considere complete mesmo que outros campos estejam vazios.

IMPORTANTE: Sempre inclua TODOS os campos no JSON de resposta. Use string vazia "" para strings não conhecidas e array vazio [] para listas não conhecidas. O campo "question" deve ser "" quando status="complete", e o campo "profile" deve ser um objeto vazio quando status="needs_info".`

export async function discoverBusinessProfile(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<DiscoverResult> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: DISCOVER_SYSTEM_PROMPT },
      ...messages,
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'discover_result',
        strict: true,
        schema: PROFILE_SCHEMA,
      },
    },
    temperature: 0.3,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('Empty response from OpenAI')
  }

  return JSON.parse(content) as DiscoverResult
}

const FLOW_GENERATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: [...NODE_TYPE_ALLOWLIST] },
          position: {
            type: 'object',
            additionalProperties: false,
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
            required: ['x', 'y'],
          },
          data: {
            type: 'object',
            additionalProperties: false,
            properties: {
              label: { type: 'string' },
              config: { type: 'string' },
            },
            required: ['label', 'config'],
          },
        },
        required: ['id', 'type', 'position', 'data'],
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' },
          sourceHandle: { type: 'string' },
          targetHandle: { type: 'string' },
          condition: { type: 'string' },
        },
        required: ['id', 'source', 'target', 'sourceHandle', 'targetHandle', 'condition'],
      },
    },
    variables: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array', 'date', 'null'] },
          value: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['id', 'name', 'type', 'value', 'description'],
      },
    },
  },
  required: ['name', 'description', 'nodes', 'edges', 'variables'],
} as const

const FLOW_SYSTEM_PROMPT = `Você gera fluxos de automação em formato JSON estruturado para o Zapiar Flow.

Regras obrigatórias:
- Use APENAS os tipos de nó permitidos: start, text, question, button, condition, variable, delay, http, webhook, end
- Exatamente UM nó do tipo "start"
- Todo edge.source e edge.target devem referenciar ids de nodes existentes no fluxo
- O fluxo deve começar em "start" e terminar em "end" (quando houver finalização)
- Nodes devem ter positions (x, y) que formem um fluxo visualmente legível (esquerda para direita, com espaçamento)

Tipos de nó:
- start: ponto de entrada (obrigatório, 1x)
- text: envia mensagem de texto
- question: faz uma pergunta e espera resposta (input humano)
- button: mostra botões de escolha
- condition: ramifica o fluxo por condição (edges com condition)
- variable: define/altera uma variável
- delay: pausa o fluxo (segundos/minutos)
- http: faz uma requisição HTTP externa
- webhook: espera um webhook externo (input)
- end: finaliza o fluxo

IMPORTANTE: Sempre inclua TODOS os campos no JSON:
- Edges: sempre inclua sourceHandle, targetHandle e condition (use "" quando não aplicável)
- Data dos nodes: config deve ser uma string JSON válida (ex: "{}" ou '{"message":"texto"}')
- Variables: sempre inclua value (use null quando não aplicável) e description (use "" quando não aplicável)`

export function validateFlowDefinition(def: FlowDefinition): string | null {
  const nodeTypes = new Set(def.nodes.map((n: FlowNode) => n.type))

  for (const type of nodeTypes) {
    if (!NODE_TYPE_ALLOWLIST.includes(type as NodeType)) {
      return `Invalid node type: "${type}". Allowed types: ${NODE_TYPE_ALLOWLIST.join(', ')}`
    }
  }

  const nodeIds = new Set(def.nodes.map((n: FlowNode) => n.id))
  const startNodes = def.nodes.filter((n: FlowNode) => n.type === 'start')
  if (startNodes.length !== 1) {
    return `Expected exactly 1 "start" node, found ${startNodes.length}`
  }

  for (const edge of def.edges) {
    if (!nodeIds.has(edge.source)) {
      return `Edge "${edge.source}" references unknown source node`
    }
    if (!nodeIds.has(edge.target)) {
      return `Edge "${edge.target}" references unknown target node`
    }
  }

  return null
}

export async function generateFlow(
  profile: {
    businessName: string
    segment: string
    products?: string[]
    services?: string[]
    channels?: string[]
    operationalProcesses?: string[]
    communicationStyle?: string
  },
  request: string
): Promise<FlowDefinition> {
  const userPrompt = `Perfil do negócio:
- Nome: ${profile.businessName}
- Segmento: ${profile.segment}
- Produtos: ${profile.products?.join(', ') || 'N/A'}
- Serviços: ${profile.services?.join(', ') || 'N/A'}
- Canais: ${profile.channels?.join(', ') || 'N/A'}
- Processos: ${profile.operationalProcesses?.join(', ') || 'N/A'}
- Estilo de comunicação: ${profile.communicationStyle || 'N/A'}

Pedido do usuário: ${request}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: FLOW_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'flow_definition',
        strict: true,
        schema: FLOW_GENERATION_SCHEMA,
      },
    },
    temperature: 0.4,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('Empty response from OpenAI')
  }

  const raw = JSON.parse(content)
  const flow: FlowDefinition = {
    ...raw,
    nodes: raw.nodes.map((n: any) => ({
      ...n,
      data: { ...n.data, config: n.data.config ? JSON.parse(n.data.config) : {} },
    })),
    variables: raw.variables.map((v: any) => ({
      ...v,
      value: v.value ? parseJsonValue(v.value) : null,
    })),
  }
  const error = validateFlowDefinition(flow)

  if (error) {
    const retry = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: FLOW_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
        { role: 'assistant', content },
        {
          role: 'user',
          content: `O fluxo gerado tem um erro: ${error}. Corrija e retorne um fluxo válido seguindo as mesmas regras.`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'flow_definition',
          strict: true,
          schema: FLOW_GENERATION_SCHEMA,
        },
      },
      temperature: 0.3,
    })

    const retryContent = retry.choices[0]?.message?.content
    if (!retryContent) {
      throw new Error('Empty retry response from OpenAI')
    }

    const rawRetry = JSON.parse(retryContent)
    const retryFlow: FlowDefinition = {
      ...rawRetry,
      nodes: rawRetry.nodes.map((n: any) => ({
        ...n,
        data: { ...n.data, config: n.data.config ? JSON.parse(n.data.config) : {} },
      })),
      variables: rawRetry.variables.map((v: any) => ({
        ...v,
        value: v.value ? parseJsonValue(v.value) : null,
      })),
    }
    const retryError = validateFlowDefinition(retryFlow)
    if (retryError) {
      throw new FlowGenerationError(retryError)
    }
    return retryFlow
  }

  return flow
}

export class FlowGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FlowGenerationError'
  }
}

function parseJsonValue(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export async function explainFlow(definition: FlowDefinition): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Você explica fluxos de automação em linguagem natural, em português brasileiro. Descreva o que o fluxo faz passo a passo, de forma clara e objetiva.',
      },
      {
        role: 'user',
        content: `Explique este fluxo em linguagem natural:\n\n${JSON.stringify(definition, null, 2)}`,
      },
    ],
    temperature: 0.5,
  })

  return completion.choices[0]?.message?.content || ''
}
