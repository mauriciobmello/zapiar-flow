# Sprint 3: Persistência e Sincronização

## 🎯 Objetivo

Implementar sincronização bidirecional entre o canvas visual (React Flow) e a base de dados (Supabase), com suporte para undo/redo, validação e publicação de fluxos.

## ✅ Alterações Implementadas

### 1. **FlowService** (`src/lib/flowService.ts`) - 250+ linhas

Serviço centralizado para gerenciar operações com fluxos no banco de dados:

```typescript
// Carregar definição completa
const definition = await FlowService.loadFlowDefinition(flowId)

// Salvar definição (com auto-upsert)
await FlowService.saveFlowDefinition(flowId, definition)

// Validar fluxo
const validation = FlowService.validateFlow(definition)
// Returns: { valid: boolean, errors: string[] }

// Publicar fluxo (cria versão imutável)
const version = await FlowService.publishFlow(flowId, userId, definition)

// Restaurar versão anterior
await FlowService.restoreVersion(flowId, version)

// Duplicar fluxo
const newFlowId = await FlowService.duplicateFlow(flowId, workspaceId, newName)
```

**Features:**
- ✅ UPSERT automático (criar ou atualizar)
- ✅ Validação completa antes de publicar
- ✅ Histórico de versões com snapshots
- ✅ Restauração de versões anteriores
- ✅ Duplicação de fluxos
- ✅ Tratamento de erros com mensagens claras

**Validações Implementadas:**
```
✓ Fluxo tem nó de Início
✓ Fluxo tem nó de Fim
✓ Nenhum nó órfão (desconectado)
✓ Pergunta tem variável definida
✓ HTTP tem URL definida
✓ Condição tem regra definida
```

### 2. **useFlowPersistence Hook** (`src/hooks/useFlowPersistence.ts`) - 300+ linhas

Hook customizado que gerencia o ciclo de vida completo de um fluxo:

```typescript
const {
  // Estado
  definition,        // FlowDefinition | null
  loading,          // boolean
  saving,           // boolean
  error,            // string | null
  validationErrors, // string[]
  isDirty,          // boolean (tem mudanças não salvas)
  canUndo,          // boolean
  canRedo,          // boolean

  // Ações
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
} = useFlowPersistence({ flowId })
```

**Features:**
- ✅ Carregamento automático ao montar
- ✅ Auto-save com debounce 2s
- ✅ Histórico completo de undo/redo (10 níveis)
- ✅ Validação em tempo real
- ✅ Sincronização com banco de dados
- ✅ Gerenciamento de estado completo

### 3. **Canvas.tsx** - Refatorado

Agora sincroniza perfeitamente com React Flow:

```typescript
// Canvas carrega automaticamente do hook
const { definition, updateNodes, updateEdges } = useFlowPersistence({ flowId })

// Posição dos nós sincroniza com banco
// Conexões são adicionadas ao edges array
// Tudo é persistido automaticamente
```

**Features:**
- ✅ Sincronização bidirecional nodes ↔ banco
- ✅ Sincronização bidirecional edges ↔ banco
- ✅ Atualização de posição ao mover nó
- ✅ Criação de conexões nova edge
- ✅ Loading state e tratamento de erros

### 4. **FlowEditor.tsx** - Completamente Refatorado

Agora com interface profissional e controles full-featured:

**Header:**
- ✅ Status de save (Não salvo / Salvando)
- ✅ Indicador de validação (✓ Válido / ❌ N erros)
- ✅ Botão Undo/Redo com atalhos
- ✅ Botão Publicar com validação
- ✅ Exibição de erros de validação

**Footer:**
- ✅ Contador de nós e conexões
- ✅ Versão do fluxo
- ✅ Atalhos de teclado (Ctrl+Z, Ctrl+S, Delete)
- ✅ Botões Adicionar Início e Salvar

**Keyboard Shortcuts:**
```
Ctrl+Z       → Undo
Ctrl+Shift+Z → Redo
Ctrl+S       → Save
Delete       → Remove selected node
```

**Publicação:**
- ✅ Validação antes de publicar
- ✅ Criação de versão imutável
- ✅ Feedback visual (success/error)
- ✅ Atualização automática de status

### 5. **Validação em Tempo Real**

No hook, durante cada mudança:

```typescript
const validation = FlowService.validateFlow(definition)
if (!validation.valid) {
  // Exibir erros
  // Desabilitar publicação
  // Sugerir correções
}
```

Erros exibidos no editor:
- Fluxo deve ter um nó de Início
- Fluxo deve ter um nó de Fim
- Nó "{name}" não está conectado
- Pergunta "{name}" não tem variável
- Request HTTP "{name}" não tem URL
- Condição "{name}" não tem regra

## 🔄 Fluxo de Sincronização

```
1. Usuário faz mudança (move nó, cria edge, etc)
   ↓
2. Canvas captura evento
   ↓
3. Hook updateNodes/updateEdges é chamado
   ↓
4. Definition é atualizada em memória
   ↓
5. Validação acontece automaticamente
   ↓
6. isDirty = true
   ↓
7. Timer de 2s dispara
   ↓
8. saveFlowDefinition() é chamado
   ↓
9. Supabase flow_definitions é updated/inserted
   ↓
10. isDirty = false
    ↓
11. Usuário vê "Salvo" no header
```

## 💾 Base de Dados

**Tabelas Utilizadas:**

1. **flows** - Metadados do fluxo
   - id, workspace_id, name, description, status, version, updated_at

2. **flow_definitions** - Definição completa (JSONB)
   - flow_id, definition { nodes[], edges[], variables[] }

3. **flow_versions** - Histórico de versões
   - flow_id, version, snapshot, created_by, created_at

4. **execution_logs** - Para futuro sistema de execução

## 📊 Estatísticas do Build

```
TypeScript Compilation: ✓ PASSED
Build Time: 1.39s
Modules: 260
Bundle Size: 567.66 kB (168.01 kB gzipped)
CSS Size: 23.04 kB (5.04 kB gzipped)
```

## 🚀 Próximos Passos (Sprint 4+)

### Sprint 4: Componentes Avançados
- [ ] Drag & drop de componentes para canvas
- [ ] Configuração avançada de nós
- [ ] Painel de variáveis globais
- [ ] Importação/exportação de fluxos

### Sprint 5: Execução
- [ ] Flow Engine para executar fluxos
- [ ] Sistema de logs de execução
- [ ] Tester com visualização de steps
- [ ] Debugging de fluxos

### Sprint 6: Integrações
- [ ] HTTP requests com autenticação
- [ ] Integração com APIs externas
- [ ] Credenciais criptografadas
- [ ] Webhooks

## 🧪 Teste Manual

1. **Abra um fluxo** no editor
2. **Adicione um nó** (Start) - aparece "➕ Início" no footer
3. **Mova o nó** - posição sincroniza
4. **Observe o footer** - "Não salvo" → após 2s → desaparece
5. **Pressione Ctrl+Z** - undo funciona
6. **Pressione Delete** - remove nó selecionado
7. **Clique Publicar** - valida e publica com versão

## 📝 Notas Importantes

- ✅ **Auto-save não é imediato** - usar Ctrl+S para salvar na hora
- ✅ **Undo/Redo em memória** - pode perder se recarregar a página
- ✅ **Validação impede publicação** - deve corrigir erros primeiro
- ✅ **Versões são imutáveis** - cada publicação cria snapshot novo
- ✅ **RLS policies** - apenas membros da workspace podem editar

## 🐛 Troubleshooting

**Fluxo não salva?**
- Verificar console para erros
- Confirmar que workspaceId está correto
- Validar RLS policies no Supabase

**Undo/Redo não funciona?**
- Verificar se está usando Ctrl+Z (não Cmd no Mac)
- Limite de 10 ações no histórico

**Publicação falha?**
- Verificar erros de validação (exibidos em vermelho)
- Confirmar que tem Start e End node

**Nó não sincroniza?**
- Verificar network tab no DevTools
- Confirmar que definition está sendo carregada

## 📚 Referências de Código

- [FlowService](src/lib/flowService.ts) - Operações com banco
- [useFlowPersistence Hook](src/hooks/useFlowPersistence.ts) - State management
- [Canvas.tsx](src/components/canvas/Canvas.tsx) - Sincronização visual
- [FlowEditor.tsx](src/features/flows/editor/FlowEditor.tsx) - Interface
