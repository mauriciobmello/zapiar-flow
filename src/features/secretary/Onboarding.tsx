import { useState, useRef, useEffect } from 'react'
import { api, ApiError } from '@/lib/api'
import ProfileReview from './ProfileReview'
import type { BusinessProfile } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface DiscoverResponse {
  status: 'needs_info' | 'complete'
  question?: string
  profile?: BusinessProfile
}

const MAX_TURNS = 8

export default function Onboarding() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou a Secretaria IA. Me conte sobre sua empresa — o que você faz, para quem, e como atende. Vou te fazer algumas perguntas para entender seu negócio.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const userTurns = messages.filter((m) => m.role === 'user').length

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const turnCount = newMessages.filter((m) => m.role === 'user').length
      const result = await api.post<DiscoverResponse>('/secretary/discover', {
        messages: newMessages,
      })

      if (result.status === 'complete' || turnCount >= MAX_TURNS) {
        const finalProfile = result.profile || extractPartialProfile(newMessages)
        setProfile(finalProfile)
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.question || 'Pode me contar mais?' },
        ])
      }
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 502
          ? 'Não consegui processar agora. Tente de novo.'
          : 'Ocorreu um erro. Tente novamente.'
      setMessages((prev) => [...prev, { role: 'assistant', content: message }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (profile) {
    return <ProfileReview profile={profile} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Secretaria IA</h1>
          <p className="text-sm text-gray-600">Onboarding conversacional</p>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-500">
                Pensando...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua resposta..."
              rows={2}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition"
            >
              Enviar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {userTurns}/{MAX_TURNS} turnos
          </p>
        </div>
      </main>
    </div>
  )
}

function extractPartialProfile(messages: Message[]): BusinessProfile {
  const allText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ')

  return {
    id: '',
    workspaceId: '',
    businessName: allText.slice(0, 50) || 'Meu Negócio',
    segment: 'Não especificado',
    customers: [],
    channels: [],
  }
}
