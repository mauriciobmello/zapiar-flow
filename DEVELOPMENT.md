# Zapiar Flow - Guia de Desenvolvimento

## Status do Projeto (18/08/2026)

### Sprints Completadas ✅

**Sprint 1 - Fundação**
- ✅ Projeto base (Vite + React + TypeScript)
- ✅ Autenticação com Supabase
- ✅ Sistema de Workspaces
- ✅ Dashboard com listagem de fluxos
- ✅ Schema SQL completo

**Sprint 2 - Editor e Canvas**
- ✅ Canvas visual (React Flow)
- ✅ 9 tipos de nodes implementados
- ✅ Component Library (painel lateral)
- ✅ Properties Panel (edição de propriedades)
- ✅ Stores para gerenciar estado

### Arquitetura Implementada

```
Frontend (React + TypeScript)
├── App.tsx (Router)
├── stores/
│   ├── auth.ts (Zustand)
│   ├── workspace.ts (Zustand)
│   └── editor.ts (Zustand)
├── features/
│   ├── auth/Login.tsx
│   ├── dashboard/Dashboard.tsx
│   └── flows/editor/FlowEditor.tsx
├── components/
│   ├── canvas/Canvas.tsx (React Flow)
│   ├── nodes/NodeComponents.tsx
│   └── panels/
│       ├── ComponentLibrary.tsx
│       └── PropertiesPanel.tsx
└── types/index.ts (TypeScript definitions)

Backend (Supabase)
├── Auth (JWT)
├── PostgreSQL Database
└── RLS Policies
```

## Como Executar

### Setup Inicial

1. **Instalar Dependências**
```bash
npm install
```

2. **Configurar Variáveis de Ambiente**
```bash
cp .env.example .env.local
```

Editar `.env.local`:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

3. **Criar Banco de Dados**
- Ir para console.supabase.com
- Abrir SQL Editor
- Copiar conteúdo de `supabase/migrations/001_initial_schema.sql`
- Executar

4. **Iniciar Servidor de Desenvolvimento**
```bash
npm run dev
```

Acesse: http://localhost:3000

## Próximos Passos

### Sprint 3 - Persistência (Recomendado)
1. ✅ Salvar fluxo no banco (já iniciado com auto-save)
2. ⚠️ Carregar fluxo da definição para o canvas
3. ⚠️ Sincronizar nodes/edges com banco
4. ⚠️ Implementar validação de fluxo

### Sprint 4 - Flow Engine
1. Criar executor de fluxos
2. Implementar contexto de execução
3. Resolver variáveis
4. Tratamento de erros
5. Logging de execução

### Sprint 5 - Flow Tester
1. Interface de teste
2. Simulador de execução
3. Painel de logs
4. Debug visual

### Sprint 6 - HTTP Requests
1. Node HTTP com validation
2. Headers e Body
3. Credentials seguros
4. Response parsing

### Sprint 7 - Publicação e Versioning
1. Validação antes de publicar
2. Snapshot de versões
3. Histórico de versões
4. Restore de versões

## Checklist de Desenvolvimento

### Regras Gerais
- [ ] TypeScript strict mode
- [ ] Componentização
- [ ] Sem secrets no frontend
- [ ] Tratamento de erro em todas funcionalidades
- [ ] Loading states
- [ ] Empty states
- [ ] Responsividade (desktop priority)

### Antes de Commitar
```bash
npm run type-check   # Validar TypeScript
npm run build        # Compilar projeto
npm run lint         # Verificar style
```

## Estrutura de Dados

### FlowDefinition (Salva no Banco)
```typescript
interface FlowDefinition {
  id: string
  name: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  variables: FlowVariable[]
}
```

### FlowNode
```typescript
interface FlowNode {
  id: string
  type: 'start' | 'text' | 'question' | 'button' | 'condition' | 'variable' | 'delay' | 'http' | 'end'
  position: { x: number; y: number }
  data: {
    label: string
    config: Record<string, unknown>
  }
}
```

## Como Contribuir

1. Criar branch: `git checkout -b feature/nome-da-feature`
2. Implementar alteração
3. Rodar validações:
   ```bash
   npm run type-check
   npm run build
   ```
4. Commit: `git commit -m "Descrição da mudança"`
5. Push: `git push origin feature/nome-da-feature`
6. Abrir Pull Request

## Referências

- [React Flow Docs](https://reactflow.dev)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)

## Notas Importantes

- Não adicionar novos nodes sem antes revisar a spec
- Manter a lógica de execução fora dos componentes React
- Sempre validar inputs do usuário
- Manter histórico de undo/redo funcional
- Testar em abas privadas do navegador para garantir que Supabase Auth está funcionando

## Performance

- Canvas otimizado para ~1000 nodes
- Memoização de componentes de node
- Debounce em auto-save (2s)
- Lazy loading de componentes futuros

## Suporte

Para dúvidas, consulte:
1. Seção relevante em `/Zapiar_Flow_SPEC.md`
2. Código de exemplo em componentes similares
3. Documentação dos packages usados
