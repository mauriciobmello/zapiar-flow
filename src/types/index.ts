// User and Auth
export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

// Workspace
export interface Workspace {
  id: string
  name: string
  ownerId: string
  createdAt: string
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
}

// Flow
export interface Flow {
  id: string
  workspaceId: string
  name: string
  description?: string
  status: 'draft' | 'published' | 'paused' | 'archived'
  version: number
  createdAt: string
  updatedAt: string
}

// Nodes
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

// Edges
export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  condition?: string
}

// Flow Definition
export interface FlowDefinition {
  id: string
  name: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  variables: FlowVariable[]
}

// Variables
export interface FlowVariable {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'null'
  value?: unknown
  description?: string
}

// Execution
export interface ExecutionContext {
  executionId: string
  flowId: string
  variables: Record<string, unknown>
  currentNodeId: string
  status: 'running' | 'waiting' | 'completed' | 'failed'
}

export interface Execution {
  id: string
  flowId: string
  status: 'running' | 'waiting' | 'completed' | 'failed'
  startedAt: string
  finishedAt?: string
  context: ExecutionContext
}

export interface ExecutionLog {
  id: string
  executionId: string
  nodeId: string
  status: 'success' | 'error' | 'waiting'
  input?: unknown
  output?: unknown
  error?: {
    code: string
    message: string
  }
  startedAt: string
  finishedAt?: string
}

// Versioning
export interface FlowVersion {
  id: string
  flowId: string
  version: number
  snapshot: FlowDefinition
  createdBy: string
  createdAt: string
}

// Credentials
export interface Credential {
  id: string
  workspaceId: string
  name: string
  type: string
  encryptedData: string
  createdAt: string
}

// Secretary IA
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
