import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatEntry, PollResponse, RuntimeOption, StepResponse, WaitingFor, WidgetEvent } from './types'

const WEBHOOK_POLL_MS = 2000

interface UseFlowRuntimeOptions {
  flowId: string
  apiUrl?: string
  onEvent?: (event: WidgetEvent) => void
}

export function useFlowRuntime({ flowId, apiUrl, onEvent }: UseFlowRuntimeOptions) {
  const [log, setLog] = useState<ChatEntry[]>([])
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [waitingFor, setWaitingFor] = useState<WaitingFor>(null)
  const [options, setOptions] = useState<RuntimeOption[]>([])
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const startedRef = useRef(false)
  const baseUrl = useRef(apiUrl || '/api')

  const getApiBase = useCallback(() => {
    const base = baseUrl.current
    if (base.startsWith('http')) return base
    return `${window.location.origin}${base}`
  }, [])

  const emit = useCallback(
    (type: WidgetEvent['type'], data?: unknown) => {
      onEvent?.({ type, executionId: executionId || undefined, data })
      window.dispatchEvent(new CustomEvent(type, { detail: { executionId, data } }))
    },
    [onEvent, executionId]
  )

  const applyResponse = useCallback(
    (res: StepResponse | PollResponse) => {
      const messages = 'messages' in res && res.messages ? res.messages : []
      if (messages.length > 0) {
        setLog((prev) => [
          ...prev,
          ...messages.map((m) => ({ from: 'bot' as const, text: m.text, system: m.type === 'system' })),
        ])
      }

      if ('executionId' in res && res.executionId) {
        setExecutionId(res.executionId)
      }

      setWaitingFor('waitingFor' in res ? (res.waitingFor ?? null) : null)
      setOptions('options' in res ? (res.options || []) : [])
      setFinished('finished' in res ? (res.finished ?? false) : false)

      if ('finished' in res && res.finished) {
        emit('widget:complete')
      }
      if ('waitingFor' in res && res.waitingFor === 'webhook') {
        emit('widget:webhook:waiting')
      }
    },
    [emit]
  )

  useEffect(() => {
    if (!flowId || startedRef.current) return
    startedRef.current = true

    emit('widget:start')

    const start = async () => {
      try {
        const res = await fetch(`${getApiBase()}/run/${flowId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (res.status === 404) {
          setError('Este fluxo não existe ou ainda não foi publicado.')
          emit('widget:error', 'Flow not found')
          setLoading(false)
          return
        }

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error || `Request failed with status ${res.status}`)
        }

        const data = (await res.json()) satisfies StepResponse
        applyResponse(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao iniciar o fluxo'
        setError(message)
        emit('widget:error', message)
      } finally {
        setLoading(false)
      }
    }

    start()
  }, [flowId, applyResponse, emit])

  useEffect(() => {
    if (waitingFor !== 'webhook' || !flowId || !executionId) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${getApiBase()}/run/${flowId}/${executionId}/poll`)
        if (!res.ok) return
        const data = (await res.json()) satisfies PollResponse
        if (data.changed && data.executionId) {
          applyResponse(data as StepResponse)
        }
      } catch {
        // transient poll failure
      }
    }, WEBHOOK_POLL_MS)

    return () => clearInterval(interval)
  }, [waitingFor, flowId, executionId, applyResponse])

  const sendReply = useCallback(
    async (value: string) => {
      if (!flowId || !executionId || !value.trim()) return

      setLog((prev) => [...prev, { from: 'user', text: value }])
      setWaitingFor(null)
      setOptions([])
      emit('widget:reply', value)

      try {
        const res = await fetch(`${getApiBase()}/run/${flowId}/${executionId}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: value }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error || `Request failed with status ${res.status}`)
        }

        const data = (await res.json()) satisfies StepResponse
        applyResponse(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao enviar resposta'
        setError(message)
        emit('widget:error', message)
      }
    },
    [flowId, executionId, applyResponse, emit]
  )

  const webhookUrl = executionId
    ? `${getApiBase().replace(/\/api$/, '')}/webhook/${executionId}`
    : ''

  return {
    log,
    executionId,
    waitingFor,
    options,
    finished,
    sendReply,
    webhookUrl,
    error,
    loading,
  }
}
