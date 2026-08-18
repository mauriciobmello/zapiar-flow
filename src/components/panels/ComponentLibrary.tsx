import { DragEvent } from 'react'

interface ComponentLibraryProps {
  onNodeDragStart?: (type: string, event: DragEvent) => void
}

const components = [
  {
    type: 'start',
    label: 'Início',
    icon: '▶',
    description: 'Inicia o fluxo',
  },
  {
    type: 'text',
    label: 'Mensagem',
    icon: '💬',
    description: 'Envia uma mensagem',
  },
  {
    type: 'question',
    label: 'Pergunta',
    icon: '❓',
    description: 'Faz uma pergunta',
  },
  {
    type: 'button',
    label: 'Botões',
    icon: '🔘',
    description: 'Mostra opções',
  },
  {
    type: 'condition',
    label: 'Condição',
    icon: '🔀',
    description: 'Toma decisões',
  },
  {
    type: 'variable',
    label: 'Variável',
    icon: '📝',
    description: 'Define variável',
  },
  {
    type: 'delay',
    label: 'Aguardar',
    icon: '⏱',
    description: 'Pausa a execução',
  },
  {
    type: 'http',
    label: 'HTTP',
    icon: '🌐',
    description: 'Faz requisição HTTP',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: '🪝',
    description: 'Aguarda chamada externa',
  },
  {
    type: 'end',
    label: 'Fim',
    icon: '⏹',
    description: 'Encerra o fluxo',
  },
]

export default function ComponentLibrary({ onNodeDragStart }: ComponentLibraryProps) {
  const handleDragStart = (type: string, event: DragEvent) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/reactflow', type)
    onNodeDragStart?.(type, event)
  }

  return (
    <div className="h-full w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="font-bold text-gray-900 mb-4">Componentes</h2>

      <div className="space-y-2">
        {components.map((component) => (
          <div
            key={component.type}
            draggable
            onDragStart={(e) => handleDragStart(component.type, e)}
            className="p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-move hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{component.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">{component.label}</div>
                <div className="text-xs text-gray-600">{component.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 <strong>Dica:</strong> Arraste um componente para o canvas para adicioná-lo
        </p>
      </div>
    </div>
  )
}
