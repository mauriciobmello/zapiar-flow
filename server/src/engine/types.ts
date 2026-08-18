export interface Position {
  x: number
  y: number
}

export interface FlowNode {
  id: string
  type: string
  position: Position
  data: {
    label: string
    config: Record<string, unknown>
  }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface FlowDefinition {
  id: string
  name: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  variables?: unknown[]
}

export interface ExecutionContext {
  variables: Record<string, unknown>
  currentNodeId: string | null
}

export interface RuntimeOption {
  label: string
  value: string
}

export interface RuntimeMessage {
  type: 'text' | 'question' | 'button' | 'webhook' | 'end' | 'system'
  text: string
  options?: RuntimeOption[]
}

export interface StepResult {
  messages: RuntimeMessage[]
  waitingFor: 'question' | 'button' | 'webhook' | null
  options?: RuntimeOption[]
  finished: boolean
  context: ExecutionContext
}
