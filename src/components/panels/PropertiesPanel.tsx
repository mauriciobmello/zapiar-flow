import { useState, useEffect } from 'react'
import type { FlowNode } from '@/types'
import { parseCurl } from '@/lib/curlParser'

interface PropertiesPanelProps {
  node: FlowNode | null
  onUpdate?: (node: FlowNode) => void
}

function isValidJsonOrEmpty(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return true
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export default function PropertiesPanel({ node, onUpdate }: PropertiesPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [curlInput, setCurlInput] = useState('')
  const [curlError, setCurlError] = useState<string | null>(null)

  useEffect(() => {
    if (node?.data.config) {
      setConfig(node.data.config)
    }
  }, [node?.data.config])

  if (!node) {
    return (
      <div className="h-full w-64 bg-white border-l border-gray-200 p-4 flex items-center justify-center text-gray-500">
        <p className="text-sm">Selecione um nó para editar suas propriedades</p>
      </div>
    )
  }

  const handleBulkConfigChange = (updates: Record<string, unknown>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)

    if (onUpdate) {
      onUpdate({
        ...node,
        data: {
          ...node.data,
          config: newConfig,
        },
      })
    }
  }

  const handleConfigChange = (key: string, value: unknown) => {
    handleBulkConfigChange({ [key]: value })
  }

  const handleImportCurl = () => {
    const parsed = parseCurl(curlInput)
    if (!parsed) {
      setCurlError('Não consegui reconhecer isso como um comando curl.')
      return
    }

    setCurlError(null)
    handleBulkConfigChange({
      method: parsed.method,
      url: parsed.url,
      headers: Object.keys(parsed.headers).length > 0 ? JSON.stringify(parsed.headers, null, 2) : '',
      body: parsed.body,
    })
  }

  return (
    <div className="h-full w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="font-bold text-gray-900 mb-4">Propriedades</h2>

      <div className="space-y-4">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
          <input
            type="text"
            value={node.data.label || ''}
            onChange={(e) =>
              onUpdate?.({
                ...node,
                data: {
                  ...node.data,
                  label: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        {/* Type-specific properties */}
        {node.type === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
            <textarea
              value={(config.message as string) || ''}
              onChange={(e) => handleConfigChange('message', e.target.value)}
              placeholder="Olá, {{nome}}!"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">Use {'{{'} variável {'}}'} para inserir variáveis</p>
          </div>
        )}

        {node.type === 'question' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pergunta</label>
              <input
                type="text"
                value={(config.question as string) || ''}
                onChange={(e) => handleConfigChange('question', e.target.value)}
                placeholder="Qual é o seu nome?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salvar em variável
              </label>
              <input
                type="text"
                value={(config.variable as string) || ''}
                onChange={(e) => handleConfigChange('variable', e.target.value)}
                placeholder="nome"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </>
        )}

        {node.type === 'button' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salvar escolha em variável
              </label>
              <input
                type="text"
                value={(config.variable as string) || ''}
                onChange={(e) => handleConfigChange('variable', e.target.value)}
                placeholder="escolha"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Opções</label>
              <div className="space-y-2">
                {(Array.isArray(config.buttons) ? (config.buttons as { label: string }[]) : []).map(
                  (btn, idx, arr) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={btn.label || ''}
                        onChange={(e) => {
                          const updated = arr.map((b, i) => (i === idx ? { ...b, label: e.target.value } : b))
                          handleConfigChange('buttons', updated)
                        }}
                        placeholder={`Opção ${idx + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfigChange('buttons', arr.filter((_, i) => i !== idx))}
                        title="Remover opção"
                        className="px-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = Array.isArray(config.buttons) ? (config.buttons as { label: string }[]) : []
                  handleConfigChange('buttons', [...current, { label: `Opção ${current.length + 1}` }])
                }}
                className="mt-2 w-full px-3 py-2 text-sm text-primary-600 border border-dashed border-primary-300 rounded-lg hover:bg-primary-50 transition"
              >
                + Adicionar opção
              </button>
            </div>
          </>
        )}

        {node.type === 'variable' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome da variável</label>
              <input
                type="text"
                value={(config.name as string) || ''}
                onChange={(e) => handleConfigChange('name', e.target.value)}
                placeholder="idade"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor</label>
              <input
                type="text"
                value={String(config.value ?? '')}
                onChange={(e) => handleConfigChange('value', e.target.value)}
                placeholder="18"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </>
        )}

        {node.type === 'condition' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condição</label>
            <input
              type="text"
              value={(config.rule as string) || ''}
              onChange={(e) => handleConfigChange('rule', e.target.value)}
              placeholder="{{variável}} == valor"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Operadores aceitos: ==, !=, &gt;, &lt;, &gt;=, &lt;=. O nó tem duas saídas — verde para
              verdadeiro, vermelha para falso.
            </p>
          </div>
        )}

        {node.type === 'delay' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duração</label>
              <input
                type="number"
                value={(config.duration as number) || 0}
                onChange={(e) => handleConfigChange('duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unidade</label>
              <select
                value={(config.unit as string) || 'segundos'}
                onChange={(e) => handleConfigChange('unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              >
                <option value="milissegundos">Milissegundos</option>
                <option value="segundos">Segundos</option>
                <option value="minutos">Minutos</option>
                <option value="horas">Horas</option>
              </select>
            </div>
          </>
        )}

        {node.type === 'http' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Importar de cURL</label>
              <textarea
                value={curlInput}
                onChange={(e) => {
                  setCurlInput(e.target.value)
                  if (curlError) setCurlError(null)
                }}
                placeholder={'curl -X POST https://api.exemplo.com/pedidos \\\n  -H "Authorization: Bearer {{token}}" \\\n  -d \'{"cliente": "{{nome}}"}\''}
                rows={3}
                spellCheck={false}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm font-mono"
              />
              <button
                type="button"
                onClick={handleImportCurl}
                disabled={!curlInput.trim()}
                className="mt-2 w-full px-3 py-2 text-sm text-primary-600 border border-dashed border-primary-300 rounded-lg hover:bg-primary-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preencher método, URL, headers e corpo
              </button>
              {curlError && <p className="text-xs text-red-600 mt-1">{curlError}</p>}
            </div>

            <hr className="border-gray-200" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Método</label>
              <select
                value={(config.method as string) || 'GET'}
                onChange={(e) => handleConfigChange('method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
              <input
                type="text"
                value={(config.url as string) || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                placeholder="https://api.exemplo.com/endpoint"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Só URLs públicas (http/https) são permitidas — endereços internos/privados são bloqueados.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Query params (JSON)</label>
              <textarea
                value={(config.queryParams as string) || ''}
                onChange={(e) => handleConfigChange('queryParams', e.target.value)}
                placeholder={'{\n  "page": "1",\n  "user": "{{nome}}"\n}'}
                rows={3}
                spellCheck={false}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm font-mono ${
                  isValidJsonOrEmpty(config.queryParams) ? 'border-gray-300' : 'border-red-400'
                }`}
              />
              {!isValidJsonOrEmpty(config.queryParams) && (
                <p className="text-xs text-red-600 mt-1">JSON inválido</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Headers (JSON)</label>
              <textarea
                value={(config.headers as string) || ''}
                onChange={(e) => handleConfigChange('headers', e.target.value)}
                placeholder={'{\n  "Authorization": "Bearer {{token}}"\n}'}
                rows={3}
                spellCheck={false}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm font-mono ${
                  isValidJsonOrEmpty(config.headers) ? 'border-gray-300' : 'border-red-400'
                }`}
              />
              {!isValidJsonOrEmpty(config.headers) && <p className="text-xs text-red-600 mt-1">JSON inválido</p>}
              <p className="text-xs text-gray-500 mt-1">
                Use {'{{'} variável {'}}'} dentro dos valores para interpolar dados do fluxo.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Corpo (body)</label>
              <textarea
                value={(config.body as string) || ''}
                onChange={(e) => handleConfigChange('body', e.target.value)}
                placeholder={'{\n  "cliente": "{{nome}}"\n}'}
                rows={3}
                spellCheck={false}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enviado como está (sem escape automático) — se for JSON, lembre de definir o header
                Content-Type.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salvar resposta em variável
              </label>
              <input
                type="text"
                value={(config.variable as string) || ''}
                onChange={(e) => handleConfigChange('variable', e.target.value)}
                placeholder="resposta"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </>
        )}

        {node.type === 'webhook' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salvar payload recebido em variável
            </label>
            <input
              type="text"
              value={(config.variable as string) || ''}
              onChange={(e) => handleConfigChange('variable', e.target.value)}
              placeholder="payload"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ao chegar neste nó, o fluxo pausa até um sistema externo fazer POST na URL do
              webhook. A URL é gerada por conversa (não por fluxo) e aparece na tela de execução
              (/run) quando o fluxo chega até aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
