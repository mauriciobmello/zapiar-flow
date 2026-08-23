import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface BaseNodeProps {
  data: {
    label: string
    config?: Record<string, unknown>
  }
  isSelected?: boolean
}

const nodeColors: Record<string, string> = {
  start: 'bg-primary-100 border-primary-400',
  end: 'bg-red-100 border-red-400',
  text: 'bg-sky-100 border-sky-400',
  question: 'bg-amber-100 border-amber-400',
  button: 'bg-violet-100 border-violet-400',
  condition: 'bg-orange-100 border-orange-400',
  variable: 'bg-indigo-100 border-indigo-400',
  delay: 'bg-pink-100 border-pink-400',
  http: 'bg-cyan-100 border-cyan-400',
  webhook: 'bg-teal-100 border-teal-400',
}

interface NodeComponentProps extends BaseNodeProps {
  type: string
  children?: React.ReactNode
}

function BaseNode({ data, isSelected, type, children }: NodeComponentProps) {
  const colorClass = nodeColors[type] || 'bg-gray-100 border-gray-400'

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 shadow-sm ${colorClass} ${
        isSelected ? 'ring-2 ring-primary-500' : ''
      } bg-white`}
    >
      <div className="font-medium text-sm text-gray-900">{data.label}</div>
      {children}
    </div>
  )
}

export const StartNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="start" data={data} isSelected={isSelected}>
    <Handle type="source" position={Position.Bottom} />
  </BaseNode>
))
StartNode.displayName = 'StartNode'

export const EndNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="end" data={data} isSelected={isSelected}>
    <Handle type="target" position={Position.Top} />
  </BaseNode>
))
EndNode.displayName = 'EndNode'

export const TextNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="text" data={data} isSelected={isSelected}>
    <Handle type="target" position={Position.Top} />
    <div className="text-xs text-gray-600 mt-2 max-w-[200px] truncate">
      {typeof data.config?.message === 'string' ? data.config.message : 'Mensagem'}
    </div>
    <Handle type="source" position={Position.Bottom} />
  </BaseNode>
))
TextNode.displayName = 'TextNode'

export const QuestionNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="question" data={data} isSelected={isSelected}>
    <Handle type="target" position={Position.Top} />
    <div className="text-xs text-gray-600 mt-2 max-w-[200px] truncate">
      {typeof data.config?.question === 'string' ? data.config.question : 'Pergunta'}
    </div>
    <Handle type="source" position={Position.Bottom} />
  </BaseNode>
))
QuestionNode.displayName = 'QuestionNode'

export const ButtonNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="button" data={data} isSelected={isSelected}>
    <Handle type="target" position={Position.Top} />
    <div className="text-xs text-gray-600 mt-2 space-y-1">
      {Array.isArray(data.config?.buttons)
        ? (data.config.buttons as any[]).map((btn, idx) => (
            <div key={idx} className="text-xs px-2 py-1 bg-gray-50 rounded">
              {btn.label || `Opção ${idx + 1}`}
            </div>
          ))
        : 'Botões'}
    </div>
    <Handle type="source" position={Position.Bottom} id="default" />
  </BaseNode>
))
ButtonNode.displayName = 'ButtonNode'

export const ConditionNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="condition" data={data} isSelected={isSelected}>
    <Handle type="target" position={Position.Top} />
    <div className="text-xs text-gray-600 mt-2">
      {typeof data.config?.rule === 'string' ? data.config.rule : 'Condição'}
    </div>
    <div className="flex justify-between text-[10px] font-medium text-gray-500 mt-2 px-0.5">
      <span className="text-green-600">Verdadeiro</span>
      <span className="text-red-600">Falso</span>
    </div>
    <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} className="!bg-green-500" />
    <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} className="!bg-red-500" />
  </BaseNode>
))
ConditionNode.displayName = 'ConditionNode'

export const VariableNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="variable" data={data} isSelected={isSelected}>
    <Handle type="target" position={Position.Top} />
    <div className="text-xs text-gray-600 mt-2">
      {typeof data.config?.name === 'string' && data.config.name ? (
        <div>
          {data.config.name} = {String(data.config?.value ?? '')}
        </div>
      ) : (
        'Variável'
      )}
    </div>
    <Handle type="source" position={Position.Bottom} />
  </BaseNode>
))
VariableNode.displayName = 'VariableNode'

export const DelayNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="delay" data={data} isSelected={isSelected}>
    <Handle type="target" position={Position.Top} />
    <div className="text-xs text-gray-600 mt-2">
      {String(data.config?.duration || 0)} {String(data.config?.unit || 'segundos')}
    </div>
    <Handle type="source" position={Position.Bottom} />
  </BaseNode>
))
DelayNode.displayName = 'DelayNode'

export const HTTPNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="http" data={data} isSelected={isSelected}>
    <Handle type="target" position={Position.Top} />
    <div className="text-xs text-gray-600 mt-2 max-w-[200px] truncate">
      {typeof data.config?.url === 'string' ? data.config.url : 'HTTP Request'}
    </div>
    <Handle type="source" position={Position.Bottom} />
  </BaseNode>
))
HTTPNode.displayName = 'HTTPNode'

export const WebhookNode = memo(({ data, isSelected }: BaseNodeProps) => (
  <BaseNode type="webhook" data={data} isSelected={isSelected}>
    <Handle type="target" position={Position.Top} />
    <div className="text-xs text-gray-600 mt-2">
      {typeof data.config?.variable === 'string' && data.config.variable
        ? `Salvar em: ${data.config.variable}`
        : 'Aguarda chamada externa'}
    </div>
    <Handle type="source" position={Position.Bottom} />
  </BaseNode>
))
WebhookNode.displayName = 'WebhookNode'

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  text: TextNode,
  question: QuestionNode,
  button: ButtonNode,
  condition: ConditionNode,
  variable: VariableNode,
  delay: DelayNode,
  http: HTTPNode,
  webhook: WebhookNode,
}
