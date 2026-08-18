import { useCallback, useEffect, DragEvent } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { nanoid } from 'nanoid'
import { nodeTypes } from '@/components/nodes/NodeComponents'
import type { FlowDefinition, FlowEdge, FlowNode } from '@/types'

const NODE_LABELS: Record<string, string> = {
  start: 'Início',
  text: 'Mensagem',
  question: 'Pergunta',
  button: 'Botões',
  condition: 'Condição',
  variable: 'Variável',
  delay: 'Aguardar',
  http: 'HTTP',
  webhook: 'Webhook',
  end: 'Fim',
}

interface CanvasProps {
  definition: FlowDefinition | null
  updateNodes: (nodes: FlowNode[]) => void
  updateEdges: (edges: FlowEdge[]) => void
  addNode: (node: FlowNode) => void
  onNodeSelect?: (nodeId: string | null) => void
  onEdgeSelect?: (edgeId: string | null) => void
  isLoading?: boolean
}

function CanvasContent({
  definition,
  updateNodes,
  updateEdges,
  addNode,
  onNodeSelect,
  onEdgeSelect,
  isLoading,
}: CanvasProps) {
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Sync nodes from definition
  useEffect(() => {
    if (!definition?.nodes) return
    const reactFlowNodes = definition.nodes.map((node) => ({
      id: node.id,
      data: node.data,
      position: node.position,
      type: node.type,
    })) as Node<any>[]
    setNodes(reactFlowNodes)
  }, [definition?.nodes, setNodes])

  // Sync edges from definition
  useEffect(() => {
    if (!definition?.edges) return
    const reactFlowEdges = definition.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })) as Edge[]
    setEdges(reactFlowEdges)
  }, [definition?.edges, setEdges])

  // Handle node changes - sync position and removal to persistence
  const handleNodesChangeCallback = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)

      if (!definition?.nodes) return

      // React Flow's own deletion (Backspace on a selected node, multi-select
      // delete, etc.) fires 'remove' changes that only touch its local visual
      // state unless we mirror them into the persisted definition here.
      const removedIds = new Set(
        changes.filter((c): c is NodeChange & { type: 'remove' } => c.type === 'remove').map((c) => c.id)
      )

      if (removedIds.size > 0) {
        updateNodes(definition.nodes.filter((n) => !removedIds.has(n.id)))
        updateEdges(definition.edges.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target)))
        return
      }

      changes.forEach((change: any) => {
        if (change.type === 'position' && change.position) {
          updateNodes(
            definition.nodes.map((n) =>
              n.id === change.id ? { ...n, position: change.position } : n
            )
          )
        }
      })
    },
    [onNodesChange, definition, updateNodes, updateEdges]
  )

  // Handle edge changes - sync removal to persistence (same gap as nodes above)
  const handleEdgesChangeCallback = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes)

      if (!definition?.edges) return

      const removedIds = new Set(
        changes.filter((c): c is EdgeChange & { type: 'remove' } => c.type === 'remove').map((c) => c.id)
      )

      if (removedIds.size > 0) {
        updateEdges(definition.edges.filter((e) => !removedIds.has(e.id)))
      }
    },
    [onEdgesChange, definition, updateEdges]
  )

  // Handle connection - add edge
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !definition) return

      const newEdge: FlowEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
      }

      updateEdges([...definition.edges, newEdge])
    },
    [definition, updateEdges]
  )

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      onNodeSelect?.(node.id)
    },
    [onNodeSelect]
  )

  const handleEdgeClick = useCallback(
    (_: any, edge: Edge) => {
      onEdgeSelect?.(edge.id)
    },
    [onEdgeSelect]
  )

  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null)
    onEdgeSelect?.(null)
  }, [onNodeSelect, onEdgeSelect])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type || !definition) return

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })

      const newNode: FlowNode = {
        id: nanoid(),
        type,
        position,
        data: {
          label: NODE_LABELS[type] || type,
          config: {},
        },
      }

      addNode(newNode)
    },
    [definition, screenToFlowPosition, addNode]
  )

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Carregando canvas...</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChangeCallback}
        onEdgesChange={handleEdgesChangeCallback}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}

export default function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasContent {...props} />
    </ReactFlowProvider>
  )
}
