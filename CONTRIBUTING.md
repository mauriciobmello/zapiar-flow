# Contribuindo para o Zapiar Flow

Obrigado por querer contribuir para o Zapiar Flow! Este documento descreve o processo de contribuição.

## Código de Conduta

Seja respeitoso com outros contribuidores. Aceite críticas construtivas.

## Workflow de Desenvolvimento

### 1. Entender a Especificação
Antes de começar, leia [Zapiar_Flow_SPEC.md](./Zapiar_Flow_SPEC.md). A especificação é a fonte de verdade do projeto.

### 2. Identificar Tarefa
- Procure por issues abertas
- Ou abra uma nova issue descrevendo o que quer fazer

### 3. Criar Branch
```bash
git checkout -b feature/nome-descritivo
# ou
git checkout -b fix/nome-descritivo
```

### 4. Desenvolver

#### Padrões de Código
- Use TypeScript strict mode
- Use nomes de variáveis descritivos
- Componentes React devem ser memorizados se necessário
- Mantenha componentes pequenos e reutilizáveis
- Adicione comentários em lógica complexa

#### Estrutura de Componentes
```tsx
import { memo, useCallback } from 'react'
import type { MyProps } from '@/types'

interface MyComponentProps {
  prop1: string
  prop2?: number
  onChange?: (value: string) => void
}

function MyComponent({ prop1, prop2, onChange }: MyComponentProps) {
  const handleClick = useCallback(() => {
    onChange?.(prop1)
  }, [prop1, onChange])

  return (
    <div>
      {/* JSX aqui */}
    </div>
  )
}

export default memo(MyComponent)
```

#### Naming Conventions
- Componentes: PascalCase (MyComponent.tsx)
- Arquivos: kebab-case (my-component.tsx)
- Variáveis: camelCase
- Constantes: UPPER_SNAKE_CASE
- Tipos/Interfaces: PascalCase

#### Estado e Stores
- Use Zustand para estado global
- Use useState para estado local
- Use useCallback para funções memoizadas
- Evite prop drilling (passe via context/store)

#### Estilos
- Use Tailwind CSS
- Evite CSS puro
- Mantenha consistência com cores do projeto

### 5. Testes e Validação

```bash
# Verificar TypeScript
npm run type-check

# Fazer build
npm run build

# Lint (futuro)
npm run lint
```

Todos os comandos devem passar sem erros.

### 6. Commit

```bash
# Commit com mensagem descritiva
git commit -m "feat: adiciona novo componente XYZ"
git commit -m "fix: corrige bug em função Y"
git commit -m "docs: atualiza README"
```

#### Tipos de Commit
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (sem mudança lógica)
- `refactor`: Refatoração
- `perf`: Otimização de performance
- `test`: Testes (quando forem implementados)

### 7. Push e Pull Request

```bash
git push origin feature/nome-descritivo
```

No GitHub/GitLab, abra um Pull Request com:
- Título descritivo
- Descrição clara do que foi feito
- Screenshots (se for UI)
- Checklist de validação:
  - [ ] TypeScript valida
  - [ ] Build passa
  - [ ] Sem quebra de regras de código
  - [ ] Testei a funcionalidade

## Prioridades de Desenvolvimento

Seguir ordem de prioridade:

1. **Funcionalidade** — Funciona primeiro
2. **Arquitetura** — Código limpo e organizado
3. **Segurança** — Sem secrets expostos
4. **Performance** — Otimizações
5. **UX** — Interface responsiva
6. **Extras** — Animações, temas, etc

## O que NÃO Fazer

❌ Não alterar APIs existentes sem discussão
❌ Não expor secrets/tokens no frontend
❌ Não adicionar funcionalidades futuras se MVP não está pronto
❌ Não manter estado duplicado (ex: em multiple stores)
❌ Não fazer commits gigantes (quebrar em pequenos commits)
❌ Não usar `any` em TypeScript (a menos que absolutamente necessário)
❌ Não deixar console.log() em código production
❌ Não fazer mudanças sem revisar a especificação

## O que FAZER

✅ Revisar [Zapiar_Flow_SPEC.md](./Zapiar_Flow_SPEC.md)
✅ Considerar reutilização de componentes
✅ Validar inputs do usuário
✅ Adicionar tratamento de erro
✅ Manter histórico de undo/redo funcional
✅ Usar TypeScript types
✅ Adicionar comments em código complexo
✅ Testar em navegador antes de commit

## Guias Específicos

### Adicionar Novo Tipo de Node

1. Editar [src/types/index.ts](./src/types/index.ts)
2. Adicionar tipo em `FlowNode.type`
3. Criar componente em [src/components/nodes/NodeComponents.tsx](./src/components/nodes/NodeComponents.tsx)
4. Exportar em `nodeTypes`
5. Adicionar à [src/components/panels/ComponentLibrary.tsx](./src/components/panels/ComponentLibrary.tsx)
6. Adicionar lógica de propriedades em [src/components/panels/PropertiesPanel.tsx](./src/components/panels/PropertiesPanel.tsx)

### Adicionar Novo Store

1. Criar arquivo em [src/stores/](./src/stores/)
2. Usar Zustand
3. Exportar store
4. Usar em componentes com `useStore()`

### Adicionar Nova Rota

1. Adicionar em [src/App.tsx](./src/App.tsx)
2. Criar componente em [src/features/](./src/features/)
3. Se privada, envolver com `<ProtectedRoute />`

## Dúvidas?

- Revisar [DEVELOPMENT.md](./DEVELOPMENT.md)
- Revisar [Zapiar_Flow_SPEC.md](./Zapiar_Flow_SPEC.md)
- Revisar código similares no projeto
- Abrir discussion/issue

## Reconhecimento

Obrigado por contribuir! Você será mencionado em CONTRIBUTORS.md.

---

**Lembre-se**: A qualidade do código é mais importante que a velocidade.
