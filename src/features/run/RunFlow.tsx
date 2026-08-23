import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL } from '@/lib/api'
import { useFlowRuntime } from '@/widget/useFlowRuntime'

export default function RunFlow() {
  const { flowId } = useParams<{ flowId: string }>()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const {
    log,
    executionId,
    waitingFor,
    options,
    finished,
    sendReply,
    webhookUrl,
    error,
    loading,
  } = useFlowRuntime({
    flowId: flowId || '',
    apiUrl: API_URL,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  const handleSend = useCallback(
    async (value: string) => {
      if (!value.trim()) return
      setSending(true)
      setInput('')
      try {
        await sendReply(value)
      } finally {
        setSending(false)
      }
    },
    [sendReply]
  )

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg flex flex-col h-[80vh]">
        <header className="px-4 py-3 border-b border-gray-200">
          <h1 className="font-bold text-primary-600">Zapiar Flow</h1>
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
                    ? 'bg-primary-600 text-white'
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
                  onClick={() => handleSend(opt.value)}
                  disabled={sending}
                  className="px-3 py-1.5 text-sm bg-white border border-primary-600 text-primary-600 rounded-full hover:bg-primary-50 transition disabled:opacity-50"
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
              handleSend(input)
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 text-sm font-medium"
            >
              Enviar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
