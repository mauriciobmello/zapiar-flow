export interface RuntimeOption {
  label: string
  value: string
}

export interface RuntimeMessage {
  type: 'text' | 'question' | 'button' | 'webhook' | 'end' | 'system'
  text: string
  options?: RuntimeOption[]
}

export type WaitingFor = 'question' | 'button' | 'webhook' | null

export interface ChatEntry {
  from: 'bot' | 'user'
  text: string
  system?: boolean
}

export interface StepResponse {
  executionId: string
  messages: RuntimeMessage[]
  waitingFor: WaitingFor
  options?: RuntimeOption[]
  finished: boolean
}

export interface PollResponse {
  changed: boolean
  executionId?: string
  messages?: RuntimeMessage[]
  waitingFor?: WaitingFor
  options?: RuntimeOption[]
  finished?: boolean
}

export type WidgetEventType =
  | 'widget:start'
  | 'widget:step'
  | 'widget:reply'
  | 'widget:webhook:waiting'
  | 'widget:complete'
  | 'widget:error'

export interface WidgetEvent {
  type: WidgetEventType
  executionId?: string
  data?: unknown
}

export interface WidgetTheme {
  primaryColor?: string
  backgroundColor?: string
  textColor?: string
  borderRadius?: string
  fontFamily?: string
}

export interface FlowWidgetProps {
  flowId: string
  apiUrl?: string
  theme?: WidgetTheme
  onEvent?: (event: WidgetEvent) => void
}

export interface WidgetMountConfig {
  flowId: string
  apiUrl?: string
  container?: HTMLElement | string
  theme?: WidgetTheme
  onEvent?: (event: WidgetEvent) => void
}
