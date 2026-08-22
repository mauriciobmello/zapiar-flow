export interface BusinessProfile {
  id: string
  workspaceId: string
  businessName: string
  segment: string
  subsegment?: string
  businessModel?: string
  customers: string[]
  products?: string[]
  services?: string[]
  channels: string[]
  departments?: string[]
  businessHours?: unknown
  operationalProcesses?: string[]
  communicationStyle?: string
  restrictions?: string[]
}

export interface SecretaryAgent {
  id: string
  workspaceId: string
  businessProfileId: string
  flowId: string | null
  name: string
  description?: string
  autonomyLevel: 'assistida' | 'semi_autonoma' | 'autonoma'
  status: 'draft' | 'active' | 'paused'
  systemInstructions?: string
}

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
  condition?: string
}

export interface FlowVariable {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'null'
  value?: unknown
  description?: string
}

export interface FlowDefinition {
  id: string
  name: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  variables: FlowVariable[]
}
