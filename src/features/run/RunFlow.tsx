import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError, API_URL } from '@/lib/api'

interface RuntimeOption {
  label: string
  value: string
}

interface RuntimeMessage {
  type: 'text' | 'question' | 'button' | 'webhook' | 'end' | 'system'
  text: string
  options?: RuntimeOption[]
}

type WaitingFor = 'question' | 'button' | 'webhook' | null

interface StepResponse {
  executionId: string
  messages: RuntimeMessage[]
  waitingFor: WaitingFor
  options?: RuntimeOption[]
  finished: boolean
}

interface PollResponse {
  changed: boolean
  executionId?: string
  messages?: RuntimeMessage[]
  waitingFor?: WaitingFor
  options?: RuntimeOption[]
  finished?: boolean
}

const WEBHOOK_POLL_MS = 2000

interface ChatEntry {
  from: 'bot' | 'user'
  text: string
  system?: boolean
}

export default function RunFlow() {
  const { flowId } = useParams<{ flowId: string }>()
  const [log, setLog] = useState<ChatEntry[]>([])
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [waitingFor, setWaitingFor] = useState<WaitingFor>(null)
  const [options, setOptions] = useState<RuntimeOption[]>([])
  const [finished, setFinished] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const applyResponse = useCallback((res: StepResponse) => {
    setLog((prev) => [
      ...prev,
      ...res.messages.map((m) => ({ from: 'bot' as const, text: m.text, system: m.type === 'system' })),
    ])
    setExecutionId(res.executionId)
    setWaitingFor(res.waitingFor)
    setOptions(res.options || [])
    setFinished(res.finished)
  }, [])

  const startedRef = useRef(false)

  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invoke of effects,
    // which would otherwise start two executions and duplicate every message.
    if (!flowId || startedRef.current) return
    startedRef.current = true

    api
      .post<StepResponse>(`/run/${flowId}/start`)
      .then(applyResponse)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError('Este fluxo não existe ou ainda não foi publicado.')
        } else {
          setError(err instanceof Error ? err.message : 'Erro ao iniciar o fluxo')
        }
      })
      .finally(() => setLoading(false))
  }, [flowId, applyResponse])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  const sendReply = useCallback(
    async (value: string) => {
      if (!flowId || !executionId || !value.trim()) return

      setLog((prev) => [...prev, { from: 'user', text: value }])
      setWaitingFor(null)
      setOptions([])
      setInput('')
      setSending(true)

      try {
        const res = await api.post<StepResponse>(`/run/${flowId}/${executionId}/reply`, { input: value })
        applyResponse(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao enviar resposta')
      } finally {
        setSending(false)
      }
    },
    [flowId, executionId, applyResponse]
  )

  // Nothing in the browser can know when an external system calls the
  // webhook — it happens entirely server-side. Poll for it while waiting.
  useEffect(() => {
    if (waitingFor !== 'webhook' || !flowId || !executionId) return

    const interval = setInterval(async () => {
      try {
        const res = await api.get<PollResponse>(`/run/${flowId}/${executionId}/poll`)
        if (res.changed && res.executionId) {
          applyResponse(res as StepResponse)
        }
      } catch {
        // Transient poll failures aren't worth surfacing — just try again next tick.
      }
    }, WEBHOOK_POLL_MS)

    return () => clearInterval(interval)
  }, [waitingFor, flowId, executionId, applyResponse])

  const webhookUrl = executionId ? `${API_URL}/webhook/${executionId}` : ''

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg flex flex-col h-[80vh]">
        <header className="px-4 py-3 border-b border-gray-200">
          <h1 className="font-bold text-gray-900">Zapiar Flow</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading && <div className="text-center text-gray-500 text-sm">Carregando...</div>}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          {log.map((entry, idx) => (
            <div key={idx} className={`flex ${entry.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  entry.from === 'user'
                    ? 'bg-blue-600 text-white'
                    : entry.system
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                      : 'bg-gray-100 text-gray-900'
                }`}
              >
                {entry.text}
              </div>
            </div>
          ))}

          {waitingFor === 'button' && options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => sendReply(opt.value)}
                  disabled={sending}
                  className="px-3 py-1.5 text-sm bg-white border border-blue-600 text-blue-600 rounded-full hover:bg-blue-50 transition disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {waitingFor === 'webhook' && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2 text-teal-800 font-medium mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Aguardando chamada externa...
              </div>
              <p className="text-xs text-teal-700 mb-1">Faça um POST (JSON) nesta URL para continuar:</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-white border border-teal-200 rounded px-2 py-1 break-all">
                  {webhookUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(webhookUrl)}
                  className="text-xs px-2 py-1 text-teal-700 border border-teal-300 rounded hover:bg-teal-100 transition shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          {finished && !error && (
            <div className="text-center text-xs text-gray-500 pt-2">Fim da conversa</div>
          )}

          <div ref={bottomRef} />
        </div>

        {waitingFor === 'question' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendReply(input)
            }}
            className="border-t border-gray-200 p-3 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua resposta..."
              autoFocus
              disabled={sending}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 text-sm font-medium"
            >
              Enviar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
