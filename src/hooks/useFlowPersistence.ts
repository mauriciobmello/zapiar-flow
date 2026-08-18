import { useCallback, useState, useEffect } from 'react'
import { Node, Edge } from 'reactflow'
import { FlowService } from '@/lib/flowService'
import type { FlowDefinition, FlowNode, FlowEdge } from '@/types'

interface UseFlowPersistenceProps {
  flowId: string
  onDefinitionLoaded?: (definition: FlowDefinition) => void
  onError?: (error: Error) => void
}

interface PersistenceState {
  definition: FlowDefinition | null
  loading: boolean
  saving: boolean
  error: string | null
  validationErrors: string[]
  isDirty: boolean
  canUndo: boolean
  canRedo: boolean
}

export function useFlowPersistence({
  flowId,
  onDefinitionLoaded,
  onError,
}: UseFlowPersistenceProps) {
  const [state, setState] = useState<PersistenceState>({
    definition: null,
    loading: true,
    saving: false,
    error: null,
    validationErrors: [],
    isDirty: false,
    canUndo: false,
    canRedo: false,
  })

  const [history, setHistory] = useState<{
    past: FlowDefinition[]
    future: FlowDefinition[]
  }>({
    past: [],
    future: [],
  })

  // Load flow on mount
  useEffect(() => {
    const loadFlow = async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }))

        let definition = await FlowService.loadFlowDefinition(flowId)

        if (!definition) {
          // Create empty flow
          definition = {
            id: flowId,
            name: '',
            nodes: [],
            edges: [],
            variables: [],
          }
          await FlowService.saveFlowDefinition(flowId, definition)
        }

        setState((s) => ({
          ...s,
          definition,
          loading: false,
          isDirty: false,
        }))

        onDefinitionLoaded?.(definition)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to load flow')
        setState((s) => ({ ...s, error: err.message, loading: false }))
        onError?.(err)
      }
    }

    loadFlow()
  }, [flowId, onDefinitionLoaded, onError])

  // Auto-save with debounce
  useEffect(() => {
    if (!state.isDirty || !state.definition) return

    const timer = setTimeout(async () => {
      try {
        setState((s) => ({ ...s, saving: true }))
        await FlowService.saveFlowDefinition(flowId, state.definition!)
        setState((s) => ({ ...s, saving: false, isDirty: false, error: null }))
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to save flow')
        setState((s) => ({ ...s, saving: false, error: err.message }))
        onError?.(err)
      }
    }, 2000) // Wait 2 seconds before saving

    return () => clearTimeout(timer)
  }, [state.isDirty, state.definition, flowId, onError])

  // Update definition and mark as dirty
  const updateDefinition = useCallback((updater: (def: FlowDefinition) => FlowDefinition) => {
    setState((s) => {
      if (!s.definition) return s

      const newDefinition = updater(s.definition)

      // Add to history
      setHistory((h) => ({
        past: [...h.past, s.definition!],
        future: [],
      }))

      // Validate
      const validation = FlowService.validateFlow(newDefinition)

      return {
        ...s,
        definition: newDefinition,
        isDirty: true,
        validationErrors: validation.errors,
        canUndo: true,
      }
    })
  }, [])

  // Update nodes
  const updateNodes = useCallback(
    (nodes: FlowNode[]) => {
      updateDefinition((def) => ({
        ...def,
        nodes,
      }))
    },
    [updateDefinition]
  )

  // Update edges
  const updateEdges = useCallback(
    (edges: FlowEdge[]) => {
      updateDefinition((def) => ({
        ...def,
        edges,
      }))
    },
    [updateDefinition]
  )

  // Add node
  const addNode = useCallback(
    (node: FlowNode) => {
      updateNodes([...(state.definition?.nodes || []), node])
    },
    [state.definition?.nodes, updateNodes]
  )

  // Delete node
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!state.definition) return

      const newNodes = state.definition.nodes.filter((n) => n.id !== nodeId)
      const newEdges = state.definition.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      )

      updateDefinition((def) => ({
        ...def,
        nodes: newNodes,
        edges: newEdges,
      }))
    },
    [state.definition, updateDefinition]
  )

  // Add edge
  const addEdge = useCallback(
    (edge: FlowEdge) => {
      updateEdges([...(state.definition?.edges || []), edge])
    },
    [state.definition?.edges, updateEdges]
  )

  // Delete edge
  const deleteEdge = useCallback(
    (edgeId: string) => {
      if (!state.definition) return
      updateEdges(state.definition.edges.filter((e) => e.id !== edgeId))
    },
    [state.definition, updateEdges]
  )

  // Undo
  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h

      const previous = h.past[h.past.length - 1]
      const newPast = h.past.slice(0, -1)

      setState((s) => ({
        ...s,
        definition: previous,
        isDirty: true,
        canUndo: newPast.length > 0,
        canRedo: true,
      }))

      return {
        past: newPast,
        future: [...h.future, state.definition!],
      }
    })
  }, [state.definition])

  // Redo
  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h

      const next = h.future[h.future.length - 1]
      const newFuture = h.future.slice(0, -1)

      setState((s) => ({
        ...s,
        definition: next,
        isDirty: true,
        canRedo: newFuture.length > 0,
        canUndo: true,
      }))

      return {
        past: [...h.past, state.definition!],
        future: newFuture,
      }
    })
  }, [state.definition])

  // Save immediately
  const save = useCallback(async () => {
    if (!state.definition) return

    try {
      setState((s) => ({ ...s, saving: true }))
      await FlowService.saveFlowDefinition(flowId, state.definition)
      setState((s) => ({ ...s, saving: false, isDirty: false, error: null }))
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to save flow')
      setState((s) => ({ ...s, saving: false, error: err.message }))
      onError?.(err)
    }
  }, [state.definition, flowId, onError])

  // Publish flow
  const publish = useCallback(
    async (userId: string): Promise<number> => {
      if (!state.definition) throw new Error('No flow definition')

      try {
        const version = await FlowService.publishFlow(flowId, userId, state.definition)
        setState((s) => ({ ...s, isDirty: false }))
        return version
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to publish flow')
        onError?.(err)
        throw err
      }
    },
    [state.definition, flowId, onError]
  )

  // Reset
  const reset = useCallback(() => {
    setState((s) => ({
      ...s,
      definition: s.definition,
      isDirty: false,
      error: null,
    }))
  }, [])

  return {
    // State
    definition: state.definition,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
    validationErrors: state.validationErrors,
    isDirty: state.isDirty,
    canUndo: state.canUndo,
    canRedo: state.canRedo,

    // Actions
    updateDefinition,
    updateNodes,
    updateEdges,
    addNode,
    deleteNode,
    addEdge,
    deleteEdge,
    undo,
    redo,
    save,
    publish,
    reset,
  }
}
