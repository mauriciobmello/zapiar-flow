import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, DragEvent } from 'react'
import { api, API_URL } from '@/lib/api'
import Canvas from '@/components/canvas/Canvas'
import ComponentLibrary from '@/components/panels/ComponentLibrary'
import PropertiesPanel from '@/components/panels/PropertiesPanel'
import { useFlowPersistence } from '@/hooks/useFlowPersistence'
import { useAuthStore } from '@/stores/auth'
import type { Flow, FlowNode, FlowEdge, FlowDefinition } from '@/types'
import { nanoid } from 'nanoid'

interface WebhookTestExecution {
  executionId: string
  flowId: string
  webhookUrl: string
  webhookNodes: { id: string; label: string }[]
}

export default function FlowEditor() {
  const { flowId } = useParams<{ flowId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  if (!flowId) {
    navigate('/dashboard')
    return null
  }

  const [flow, setFlow] = useState<Flow | null>(null)
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishMessage, setPublishMessage] = useState<{ type: 'success' | 'error'; text: string; runUrl?: string } | null>(
    null
  )
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [webhookTest, setWebhookTest] = useState<WebhookTestExecution | null>(null)
  const [webhookTestLoading, setWebhookTestLoading] = useState(false)

  const {
    definition,
    loading,
    saving,
    error,
    validationErrors,
    isDirty,
    canUndo,
    canRedo,
    updateNodes,
    updateEdges,
    addNode,
    deleteNode,
    undo,
    redo,
    save,
    publish,
  } = useFlowPersistence({
    flowId,
  })

  const webhookNodes = definition?.nodes.filter((n) => n.type === 'webhook') || []
  const hasWebhooks = webhookNodes.length > 0

  // Load flow metadata
  useEffect(() => {
    const fetchFlow = async () => {
      try {
        const data = await api.get<{
          id: string
          workspace_id: string
          name: string
          description?: string
          status: Flow['status']
          version: number
          created_at: string
          updated_at: string
        }>(`/flows/${flowId}`)

        setFlow({
          id: data.id,
          workspaceId: data.workspace_id,
          name: data.name,
          description: data.description,
          status: data.status,
          version: data.version,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        })
      } catch (error) {
        console.error('Failed to fetch flow:', error)
        navigate('/dashboard')
      }
    }

    fetchFlow()
  }, [flowId, navigate])

  const handleNodeUpdate = useCallback((node: FlowNode) => {
    setSelectedNode(node)
    if (definition) {
      updateNodes(
        definition.nodes.map((n) =>
          n.id === node.id
            ? node
            : n
        )
      )
    }
  }, [definition, updateNodes])

  const handleNodeDragStart = useCallback((type: string, event: DragEvent) => {
    event.dataTransfer?.setData('flowNodeType', type)
  }, [])

  const handleNodeDeleteKey = useCallback(() => {
    if (selectedNode && definition) {
      deleteNode(selectedNode.id)
      setSelectedNode(null)
    }
  }, [selectedNode, definition, deleteNode])

  const handleStartRename = useCallback(() => {
    if (!flow) return
    setNameInput(flow.name)
    setEditingName(true)
  }, [flow])

  const handleCancelRename = useCallback(() => {
    setEditingName(false)
  }, [])

  const handleSaveRename = useCallback(async () => {
    const name = nameInput.trim()
    if (!flow || !name || name === flow.name) {
      setEditingName(false)
      return
    }

    setRenaming(true)
    try {
      await api.patch(`/flows/${flowId}`, { name })
      setFlow((prev) => (prev ? { ...prev, name } : prev))
      setEditingName(false)
    } catch (err) {
      console.error('Failed to rename flow:', err)
    } finally {
      setRenaming(false)
    }
  }, [flow, flowId, nameInput])

  const handlePublish = async () => {
    if (!user || !definition) return

    try {
      setPublishLoading(true)
      const version = await publish(user.id)
      setPublishMessage({
        type: 'success',
        text: `Fluxo publicado com sucesso! Versão ${version}. Veja funcionando em:`,
        runUrl: `${window.location.origin}/run/${flowId}`,
      })
    } catch (error) {
      setPublishMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao publicar',
      })
      setTimeout(() => setPublishMessage(null), 4000)
    } finally {
      setPublishLoading(false)
    }
  }

  const handleStartWebhookTest = async () => {
    if (!flowId || !definition) return

    const webhookNodeIds = definition.nodes.filter((n) => n.type === 'webhook')
    if (webhookNodeIds.length === 0) return

    setWebhookTestLoading(true)
    try {
      const res = await api.post<{
        executionId: string
        waitingFor: string
        finished: boolean
      }>(`/run/${flowId}/start`)

      if (res.waitingFor === 'webhook' || res.finished === false) {
        setWebhookTest({
          executionId: res.executionId,
          flowId,
          webhookUrl: `${API_URL}/webhook/${res.executionId}`,
          webhookNodes: webhookNodeIds.map((n) => ({ id: n.id, label: n.data.label })),
        })
      }
    } catch (error) {
      console.error('Failed to start webhook test:', error)
    } finally {
      setWebhookTestLoading(false)
    }
  }

  const handleCloseWebhookTest = () => {
    setWebhookTest(null)
  }

  const handleAddStartNode = useCallback(() => {
    if (!definition) return

    // Check if already has start node
    if (definition.nodes.some((n) => n.type === 'start')) {
      alert('Fluxo já tem um nó de Início')
      return
    }

    const newNode: FlowNode = {
      id: nanoid(),
      type: 'start',
      position: { x: 250, y: 25 },
      data: {
        label: 'Início',
        config: {},
      },
    }

    addNode(newNode)
  }, [definition, addNode])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo()
      }

      // Ctrl+S / Cmd+S
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        save()
      }

      // Delete key
      if (event.key === 'Delete' && selectedNode) {
        event.preventDefault()
        handleNodeDeleteKey()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, save, selectedNode, handleNodeDeleteKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando editor...</p>
        </div>
      </div>
    )
  }

  if (!flow) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Fluxo não encontrado</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50" onKeyDown={(e) => {
      if (e.key === 'Delete' && selectedNode) {
        handleNodeDeleteKey()
      }
    }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition px-2 py-1 hover:bg-gray-100 rounded"
            >
              ← Voltar
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {editingName ? (
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={handleSaveRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSaveRename()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        handleCancelRename()
                      }
                    }}
                    autoFocus
                    disabled={renaming}
                     className="text-xl font-bold text-gray-900 border border-primary-400 rounded px-1 -mx-1 outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  />
                ) : (
                  <h1
                    onClick={handleStartRename}
                    title="Clique para renomear"
                    className="text-xl font-bold text-gray-900 cursor-text hover:bg-gray-100 rounded px-1 -mx-1 transition"
                  >
                    {flow.name}
                  </h1>
                )}
                {isDirty && (
                  <span className="text-xs font-medium text-orange-600 px-2 py-1 bg-orange-50 rounded">
                    Não salvo
                  </span>
                )}
                {saving && (
                  <span className="text-xs font-medium text-primary-600 px-2 py-1 bg-primary-50 rounded">
                    Salvando...
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {validationErrors.length > 0 && (
                  <span className="text-red-600">{validationErrors.length} erro(s) de validação</span>
                )}
                {validationErrors.length === 0 && definition && (
                  <span className="text-green-600">✓ Fluxo válido</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {publishMessage && (
              <div
                className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded ${
                  publishMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                <span>{publishMessage.text}</span>
                {publishMessage.runUrl && (
                  <a
                    href={publishMessage.runUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:no-underline"
                  >
                    {publishMessage.runUrl}
                  </a>
                )}
                <button
                  onClick={() => setPublishMessage(null)}
                  className="text-current opacity-60 hover:opacity-100"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex gap-1 px-2 py-1 bg-gray-100 rounded-lg">
              <button
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ↶
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ↷
              </button>
            </div>

            <button
              onClick={handlePublish}
              disabled={publishLoading || validationErrors.length > 0}
               className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {publishLoading ? '...' : '🚀 Publicar'}
            </button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-900 mb-2">Erros de validação:</p>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </header>

      {/* Main Editor */}
      <main className="flex-1 overflow-hidden flex">
        {/* Left Sidebar - Components */}
        <ComponentLibrary onNodeDragStart={handleNodeDragStart} />

        {/* Canvas */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          <Canvas
            definition={definition}
            updateNodes={updateNodes}
            updateEdges={updateEdges}
            addNode={addNode}
            onNodeSelect={(nodeId) => {
              if (nodeId && definition) {
                const node = definition.nodes.find((n) => n.id === nodeId)
                if (node) setSelectedNode(node)
              } else {
                setSelectedNode(null)
              }
            }}
            isLoading={loading}
          />
        </div>

        {/* Right Sidebar - Properties */}
        <PropertiesPanel node={selectedNode} onUpdate={handleNodeUpdate} />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-3 text-sm text-gray-600 flex justify-between items-center">
        <div>
          {definition && (
            <>
              <span>{definition.nodes.length} nós</span>
              <span className="mx-2">•</span>
              <span>{definition.edges.length} conexões</span>
              <span className="mx-2">•</span>
              <span>v{flow.version}</span>
            </>
          )}
        </div>

        <div className="flex gap-4 text-xs">
          <span className="text-gray-500">
            Ctrl+Z/Cmd+Z: Undo | Ctrl+Shift+Z/Cmd+Shift+Z: Redo | Ctrl+S/Cmd+S: Salvar | Delete: Remover
          </span>
        </div>

        <div className="flex gap-2">
          {hasWebhooks && (
            <button
              onClick={handleStartWebhookTest}
              disabled={webhookTestLoading || flow?.status !== 'published'}
              title={flow?.status !== 'published' ? 'Publique o fluxo para testar webhooks' : 'Testar webhooks'}
              className="px-3 py-1 text-teal-700 hover:bg-teal-50 border border-teal-300 rounded transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {webhookTestLoading ? '⏳ Testando...' : '🪝 Testar Webhook'}
            </button>
          )}
          <button
            onClick={handleAddStartNode}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded transition text-xs"
          >
            ➕ Início
          </button>
          <button
            onClick={() => save()}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded transition text-xs"
          >
            💾 Salvar
          </button>
        </div>
      </footer>

      {/* Webhook Test Panel */}
      {webhookTest && (
        <div className="fixed bottom-16 right-4 w-96 bg-white border border-teal-200 rounded-lg shadow-xl z-50">
          <div className="px-4 py-3 border-b border-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="font-medium text-teal-900 text-sm">Teste de Webhook</span>
            </div>
            <button
              onClick={handleCloseWebhookTest}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">URL do webhook (POST JSON):</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 break-all text-teal-800">
                  {webhookTest.webhookUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(webhookTest.webhookUrl)}
                  className="text-xs px-2 py-1 text-teal-700 border border-teal-300 rounded hover:bg-teal-50 transition shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Nodes webhook no fluxo:</p>
              <ul className="text-xs text-gray-700 space-y-1">
                {webhookTest.webhookNodes.map((n) => (
                  <li key={n.id} className="flex items-center gap-1">
                    <span className="text-teal-500">🪝</span>
                    {n.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-teal-50 border border-teal-100 rounded px-3 py-2">
              <p className="text-xs text-teal-700">
                <strong>Como testar:</strong> Faça um POST JSON na URL acima para continuar a execução do fluxo.
                Exemplo: <code className="bg-white px-1 rounded">curl -X POST {webhookTest.webhookUrl} -d '{`{"chave":"valor"}`}'</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
