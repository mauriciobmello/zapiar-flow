import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { useWorkspaceStore } from '@/stores/workspace'
import type { BusinessProfile } from '@/types'

interface ProfileReviewProps {
  profile: BusinessProfile
}

export default function ProfileReview({ profile }: ProfileReviewProps) {
  const navigate = useNavigate()
  const { currentWorkspace, workspaces, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore()

  useEffect(() => {
    if (!currentWorkspace && workspaces.length === 0) {
      fetchWorkspaces()
    }
  }, [currentWorkspace, workspaces.length, fetchWorkspaces])

  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0])
    }
  }, [currentWorkspace, workspaces, setCurrentWorkspace])

  const [form, setForm] = useState({
    businessName: profile.businessName,
    segment: profile.segment,
    subsegment: profile.subsegment || '',
    businessModel: profile.businessModel || '',
    customers: profile.customers.join(', '),
    products: (profile.products || []).join(', '),
    services: (profile.services || []).join(', '),
    channels: profile.channels.join(', '),
    departments: (profile.departments || []).join(', '),
    communicationStyle: profile.communicationStyle || '',
    operationalProcesses: (profile.operationalProcesses || []).join(', '),
    restrictions: (profile.restrictions || []).join(', '),
  })

  const [request, setRequest] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleGenerate = async () => {
    if (!currentWorkspace) {
      setError('Selecione um workspace antes de gerar o fluxo.')
      return
    }
    if (!request.trim()) {
      setError('Descreva o que você quer que a secretaria faça.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await api.post<{ agentId: string; flowId: string }>('/secretary/agents', {
        workspaceId: currentWorkspace.id,
        profile: {
          businessName: form.businessName,
          segment: form.segment,
          subsegment: form.subsegment || undefined,
          businessModel: form.businessModel || undefined,
          customers: form.customers.split(',').map((s) => s.trim()).filter(Boolean),
          products: form.products.split(',').map((s) => s.trim()).filter(Boolean),
          services: form.services.split(',').map((s) => s.trim()).filter(Boolean),
          channels: form.channels.split(',').map((s) => s.trim()).filter(Boolean),
          departments: form.departments.split(',').map((s) => s.trim()).filter(Boolean),
          communicationStyle: form.communicationStyle || undefined,
          operationalProcesses: form.operationalProcesses.split(',').map((s) => s.trim()).filter(Boolean),
          restrictions: form.restrictions.split(',').map((s) => s.trim()).filter(Boolean),
        },
        request,
      })

      navigate(`/flows/${result.flowId}/editor`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError('Não consegui gerar um fluxo válido. Reformule seu pedido e tente de novo.')
      } else if (err instanceof ApiError && err.status === 502) {
        setError('Não consegui processar agora. Tente de novo.')
      } else {
        setError('Ocorreu um erro ao gerar o fluxo. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Revisar Perfil</h1>
          <p className="text-sm text-gray-600">Confira e edite os dados antes de gerar o fluxo</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Dados do Negócio</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Negócio</label>
              <input
                type="text"
                value={form.businessName}
                onChange={handleChange('businessName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
              <input
                type="text"
                value={form.segment}
                onChange={handleChange('segment')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subsegmento</label>
              <input
                type="text"
                value={form.subsegment}
                onChange={handleChange('subsegment')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Negócio</label>
              <input
                type="text"
                value={form.businessModel}
                onChange={handleChange('businessModel')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clientes (separados por vírgula)</label>
            <input
              type="text"
              value={form.customers}
              onChange={handleChange('customers')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produtos (separados por vírgula)</label>
            <input
              type="text"
              value={form.products}
              onChange={handleChange('products')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serviços (separados por vírgula)</label>
            <input
              type="text"
              value={form.services}
              onChange={handleChange('services')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canais (separados por vírgula)</label>
            <input
              type="text"
              value={form.channels}
              onChange={handleChange('channels')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamentos (separados por vírgula)</label>
            <input
              type="text"
              value={form.departments}
              onChange={handleChange('departments')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estilo de Comunicação</label>
            <input
              type="text"
              value={form.communicationStyle}
              onChange={handleChange('communicationStyle')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">O que você quer automatizar?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Descreva em linguagem natural o que a secretaria deve fazer para você.
          </p>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Ex: Quero um fluxo de boas-vindas para novos clientes no WhatsApp, apresentando a empresa e perguntando como podem ser atendidos."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          />
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition"
          >
            {loading ? 'Gerando...' : 'Gerar Fluxo'}
          </button>
        </div>
      </main>
    </div>
  )
}
