import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { api } from '@/lib/api'
import type { Flow } from '@/types'

interface FlowRow {
  id: string
  workspace_id: string
  name: string
  description?: string
  status: Flow['status']
  version: number
  created_at: string
  updated_at: string
}

function mapFlow(row: FlowRow): Flow {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { workspaces, currentWorkspace, fetchWorkspaces, createWorkspace, setCurrentWorkspace } =
    useWorkspaceStore()
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showWidgetModal, setShowWidgetModal] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      fetchWorkspaces()
    }
  }, [user, fetchWorkspaces])

  // Set first workspace as current if not set
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspace) {
      setCurrentWorkspace(workspaces[0])
    }
  }, [workspaces, currentWorkspace, setCurrentWorkspace])

  // Fetch flows when workspace changes
  useEffect(() => {
    const fetchFlows = async () => {
      if (!currentWorkspace) return

      setLoading(true)
      try {
        const rows = await api.get<FlowRow[]>(`/flows?workspaceId=${currentWorkspace.id}`)
        setFlows(rows.map(mapFlow))
      } catch (error) {
        console.error('Failed to fetch flows:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFlows()
  }, [currentWorkspace])

  const handleCreateFlow = async () => {
    if (!currentWorkspace) return

    try {
      const flow = await api.post<FlowRow>('/flows', {
        workspaceId: currentWorkspace.id,
        name: 'Novo Fluxo',
      })

      navigate(`/flows/${flow.id}/editor`)
    } catch (error) {
      console.error('Failed to create flow:', error)
    }
  }

  const handleDeleteFlow = async (e: React.MouseEvent, flowId: string) => {
    e.stopPropagation()

    if (!window.confirm('Excluir este fluxo? Essa ação não pode ser desfeita.')) return

    setDeletingId(flowId)
    try {
      await api.delete(`/flows/${flowId}`)
      setFlows((prev) => prev.filter((f) => f.id !== flowId))
    } catch (error) {
      console.error('Failed to delete flow:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpenWidget = (flow: Flow) => {
    setSelectedFlow(flow)
    setShowWidgetModal(true)
    setCopied(false)
  }

  const handleCopyWidgetCode = async () => {
    if (!selectedFlow) return

    const origin = window.location.origin
    const code = `<!-- Zapiar Flow Widget -->
<script src="${origin}/widget.js"><\/script>
<script>
  ZapiarFlowWidget.mount({
    flowId: '${selectedFlow.id}',
    container: document.body,
    theme: {
      primaryColor: '#059669',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }
  })
<\/script>`

    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !workspaceName.trim()) return

    try {
      const workspace = await createWorkspace(workspaceName)
      setCurrentWorkspace(workspace)
      setWorkspaceName('')
      setShowNewWorkspaceModal(false)
    } catch (error) {
      console.error('Failed to create workspace:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-600">Zapiar Flow</h1>
            <p className="text-gray-600 text-sm mt-1">Bem-vindo, {user?.name}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace selector */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workspace</label>
              <select
                value={currentWorkspace?.id || ''}
                onChange={(e) => {
                  const workspace = workspaces.find((w) => w.id === e.target.value)
                  if (workspace) setCurrentWorkspace(workspace)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowNewWorkspaceModal(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
            >
              + Novo Workspace
            </button>
          </div>
        </div>

        {/* Flows section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Meus Fluxos</h2>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/secretary/new')}
                className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition"
              >
                Secretaria IA
              </button>
              <button
                onClick={handleCreateFlow}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                + Novo Fluxo
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-600">Carregando...</div>
          ) : flows.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-600 mb-4">Nenhum fluxo criado ainda</p>
                  <button
                    onClick={handleCreateFlow}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                  >
                    Criar Primeiro Fluxo
                  </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className="relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => navigate(`/flows/${flow.id}/editor`)}
                >
                  <button
                    onClick={(e) => handleDeleteFlow(e, flow.id)}
                    disabled={deletingId === flow.id}
                    title="Excluir fluxo"
                    aria-label="Excluir fluxo"
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482 41.03 41.03 0 0 0-2.365-.298V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  <h3 className="font-semibold text-gray-900 pr-6">{flow.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{flow.description || 'Sem descrição'}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        flow.status === 'published'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {flow.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                    <span className="text-xs text-gray-500">v{flow.version}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenWidget(flow)
                    }}
                    className="mt-3 w-full px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                  >
                    Obter Widget
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Workspace Modal */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Novo Workspace</h2>
            <form onSubmit={handleCreateWorkspace}>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Nome do workspace"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Widget Embed Modal */}
      {showWidgetModal && selectedFlow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Embed Widget</h2>
              <button
                onClick={() => setShowWidgetModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Adicione este código ao site onde deseja exibir o fluxo <strong>{selectedFlow.name}</strong>.
            </p>
            <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-words">
{`<!-- Zapiar Flow Widget -->
<script src="${window.location.origin}/widget.js"><\/script>
<script>
  ZapiarFlowWidget.mount({
    flowId: '${selectedFlow.id}',
    container: document.body,
    theme: {
      primaryColor: '#059669',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }
  })
<\/script>`}
            </pre>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleCopyWidgetCode}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                {copied ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
