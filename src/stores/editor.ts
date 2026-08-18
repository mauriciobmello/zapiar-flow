import { create } from 'zustand'
import type { FlowNode, FlowEdge } from '@/types'

interface EditorState {
  nodes: FlowNode[]
  edges: FlowEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  history: {
    past: { nodes: FlowNode[]; edges: FlowEdge[] }[]
    future: { nodes: FlowNode[]; edges: FlowEdge[] }[]
  }

  // Node operations
  addNode: (node: FlowNode) => void
  updateNode: (id: string, data: Partial<FlowNode>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string | null) => void

  // Edge operations
  addEdge: (edge: FlowEdge) => void
  updateEdge: (id: string, data: Partial<FlowEdge>) => void
  deleteEdge: (id: string) => void
  selectEdge: (id: string | null) => void

  // Bulk operations
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void

  // History
  undo: () => void
  redo: () => void

  // Clear
  reset: () => void
}

const initialState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  history: {
    past: [],
    future: [],
  },
}

function addToHistory(past: any[], nodes: FlowNode[], edges: FlowEdge[]) {
  return [...past.slice(-9), { nodes, edges }] // Keep last 10 states
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  addNode: (node: FlowNode) => {
    set((state) => ({
      nodes: [...state.nodes, node],
      history: {
        past: addToHistory(state.history.past, [...state.nodes, node], state.edges),
        future: [],
      },
    }))
  },

  updateNode: (id: string, data: Partial<FlowNode>) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...data } : node)),
      history: {
        past: addToHistory(
          state.history.past,
          state.nodes.map((node) => (node.id === id ? { ...node, ...data } : node)),
          state.edges
        ),
        future: [],
      },
    }))
  },

  deleteNode: (id: string) => {
    set((state) => {
      const newNodes = state.nodes.filter((node) => node.id !== id)
      const newEdges = state.edges.filter((edge) => edge.source !== id && edge.target !== id)
      return {
        nodes: newNodes,
        edges: newEdges,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        history: {
          past: addToHistory(state.history.past, newNodes, newEdges),
          future: [],
        },
      }
    })
  },

  selectNode: (id: string | null) => {
    set({ selectedNodeId: id, selectedEdgeId: null })
  },

  addEdge: (edge: FlowEdge) => {
    set((state) => ({
      edges: [...state.edges, edge],
      history: {
        past: addToHistory(state.history.past, state.nodes, [...state.edges, edge]),
        future: [],
      },
    }))
  },

  updateEdge: (id: string, data: Partial<FlowEdge>) => {
    set((state) => ({
      edges: state.edges.map((edge) => (edge.id === id ? { ...edge, ...data } : edge)),
      history: {
        past: addToHistory(
          state.history.past,
          state.nodes,
          state.edges.map((edge) => (edge.id === id ? { ...edge, ...data } : edge))
        ),
        future: [],
      },
    }))
  },

  deleteEdge: (id: string) => {
    set((state) => {
      const newEdges = state.edges.filter((edge) => edge.id !== id)
      return {
        edges: newEdges,
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
        history: {
          past: addToHistory(state.history.past, state.nodes, newEdges),
          future: [],
        },
      }
    })
  },

  selectEdge: (id: string | null) => {
    set({ selectedEdgeId: id, selectedNodeId: null })
  },

  setNodes: (nodes: FlowNode[]) => {
    set((state) => ({
      nodes,
      history: {
        past: addToHistory(state.history.past, nodes, state.edges),
        future: [],
      },
    }))
  },

  setEdges: (edges: FlowEdge[]) => {
    set((state) => ({
      edges,
      history: {
        past: addToHistory(state.history.past, state.nodes, edges),
        future: [],
      },
    }))
  },

  undo: () => {
    set((state) => {
      if (state.history.past.length === 0) return state

      const previous = state.history.past[state.history.past.length - 1]
      const newPast = state.history.past.slice(0, -1)

      return {
        nodes: previous.nodes,
        edges: previous.edges,
        history: {
          past: newPast,
          future: [...state.history.future, { nodes: state.nodes, edges: state.edges }],
        },
      }
    })
  },

  redo: () => {
    set((state) => {
      if (state.history.future.length === 0) return state

      const next = state.history.future[state.history.future.length - 1]
      const newFuture = state.history.future.slice(0, -1)

      return {
        nodes: next.nodes,
        edges: next.edges,
        history: {
          past: [...state.history.past, { nodes: state.nodes, edges: state.edges }],
          future: newFuture,
        },
      }
    })
  },

  reset: () => set(initialState),
}))
