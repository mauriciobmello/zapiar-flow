import { useRef, useEffect, useState, useCallback } from 'react'
import type { ChatEntry, RuntimeOption, WaitingFor, WidgetTheme } from './types'

interface ChatWindowProps {
  log: ChatEntry[]
  waitingFor: WaitingFor
  options: RuntimeOption[]
  finished: boolean
  error: string | null
  loading: boolean
  webhookUrl: string
  sendReply: (value: string) => void
  theme?: WidgetTheme
  onClose: () => void
}

export default function ChatWindow({
  log,
  waitingFor,
  options,
  finished,
  error,
  loading,
  webhookUrl,
  sendReply,
  theme,
  onClose,
}: ChatWindowProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const primary = theme?.primaryColor || '#2563eb'
  const bg = theme?.backgroundColor || '#ffffff'
  const text = theme?.textColor || '#111827'
  const radius = theme?.borderRadius || '12px'
  const font = theme?.fontFamily || 'inherit'

  useEffect(() => {
    if (!userScrolled) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [log, userScrolled])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setUserScrolled(scrollTop + clientHeight < scrollHeight - 40)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    sendReply(input)
    setInput('')
    setSending(false)
    setUserScrolled(false)
  }

  const copyWebhook = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '84px',
        right: '20px',
        width: '360px',
        height: '500px',
        background: bg,
        borderRadius: radius,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9998,
        fontFamily: font,
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: bg,
        }}
      >
        <span style={{ fontWeight: 600, color: text, fontSize: '14px' }}>Zapiar Flow</span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: text,
            fontSize: '18px',
            lineHeight: 1,
            padding: '4px',
          }}
        >
          ×
        </button>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {loading && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', marginTop: '12px' }}>
            Carregando...
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px',
              padding: '8px 12px',
              borderRadius: '8px',
            }}
          >
            {error}
          </div>
        )}

        {log.map((entry, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: entry.from === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: 1.4,
                background: entry.from === 'user' ? primary : entry.system ? '#fffbeb' : '#f3f4f6',
                color: entry.from === 'user' ? '#ffffff' : entry.system ? '#92400e' : text,
                border: entry.system ? '1px solid #fde68a' : 'none',
                wordBreak: 'break-word',
              }}
            >
              {entry.text}
            </div>
          </div>
        ))}

        {waitingFor === 'button' && options.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setUserScrolled(false)
                  sendReply(opt.value)
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  background: bg,
                  border: `1px solid ${primary}`,
                  color: primary,
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {waitingFor === 'webhook' && (
          <div
            style={{
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              color: '#115e59',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, marginBottom: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#14b8a6',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
              Aguardando chamada externa...
            </div>
            <p style={{ margin: '0 0 6px', opacity: 0.8 }}>Faça um POST (JSON) nesta URL para continuar:</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <code
                style={{
                  flex: 1,
                  fontSize: '11px',
                  background: bg,
                  border: '1px solid #99f6e4',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  wordBreak: 'break-all',
                }}
              >
                {webhookUrl}
              </code>
              <button
                onClick={copyWebhook}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  color: '#0f766e',
                  border: '1px solid #5eead4',
                  borderRadius: '4px',
                  background: bg,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Copiar
              </button>
            </div>
          </div>
        )}

        {finished && !error && (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            Fim da conversa
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {waitingFor === 'question' && (
        <form
          onSubmit={handleSubmit}
          style={{
            borderTop: '1px solid #e5e7eb',
            padding: '10px 12px',
            display: 'flex',
            gap: '8px',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua resposta..."
            autoFocus
            disabled={sending}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
              fontFamily: font,
              color: text,
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            style={{
              padding: '8px 16px',
              background: primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !input.trim() ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            Enviar
          </button>
        </form>
      )}
    </div>
  )
}
