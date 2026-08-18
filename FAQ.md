# Zapiar Flow - Perguntas Frequentes (FAQ)

## General

### O que é Zapiar Flow?
Zapiar Flow é uma plataforma visual para criar e executar automações, fluxos de trabalho e processos digitais sem escrever código.

### Qual a stack de tecnologia?
- **Frontend**: React 18, TypeScript, Tailwind CSS, React Flow, Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Functions)
- **Build**: Vite

### Como começo?
1. Siga o [SETUP.md](./SETUP.md)
2. Abra http://localhost:3000
3. Crie uma conta
4. Comece a criar fluxos!

## Desenvolvimento

### Por que Zustand e não Redux?
Zustand é mais simples e leve para estado global. Redux seria overengineering para este projeto.

### Por que React Flow?
React Flow é a biblioteca mais popular para editores visuais baseados em nodes. Tem boa documentação e comunidade ativa.

### Por que Supabase?
Supabase fornece:
- PostgreSQL gerenciado
- Autenticação JWT built-in
- RLS para segurança
- API REST automática
- Hosting grátis na tier gratuita

### Posso usar outro banco de dados?
Sim, mas você precisa:
1. Reescrever todas as queries em `src/`
2. Implementar autenticação própria
3. Implementar RLS/permissões
4. Não recomendado nesta fase

## Fluxo de Trabalho

### Como adiciono um novo tipo de nó?
Ver [CONTRIBUTING.md - Adicionar Novo Tipo de Node](./CONTRIBUTING.md#adicionar-novo-tipo-de-node)

### Como gerencio estado global?
Use Zustand. Exemplos em `src/stores/`.

```ts
import { create } from 'zustand'

interface MyStore {
  count: number
  increment: () => void
}

export const useMyStore = create<MyStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

### Como faço requisições HTTP?
```ts
const { data, error } = await supabase
  .from('tabela')
  .select('*')
  .eq('id', id)
```

Ver [documentação Supabase](https://supabase.com/docs/client/javascript).

### Como trato erros?
```tsx
try {
  // operação
} catch (error) {
  console.error('Contexto:', error)
  // Toast, modal, etc
}
```

## Segurança

### Onde armazeno secrets/tokens?
**Nunca no frontend.** Sempre no backend via Supabase Edge Functions ou envs do servidor.

### Como protejo rotas?
Use `<ProtectedRoute />` em [src/App.tsx](./src/App.tsx).

### Como configuro RLS?
RLS já está configurado em [supabase/migrations/001_initial_schema.sql](./supabase/migrations/001_initial_schema.sql).

## Performance

### O canvas fica lento com muitos nós?
React Flow é otimizado para ~10k nós. Se ficar lento:
1. Use React DevTools para profiling
2. Verifique re-renders desnecessários
3. Use `memo()` em componentes
4. Use `useCallback()` em callbacks

### Como otimizo?
- Memoize componentes
- Use callbacks stáveis (useCallback)
- Evite re-renders com seleção cuidadosa de estado
- Split chunks em build (Vite já faz isso)

## Supabase

### Como faço queries SQL diretamente?
Vá para Supabase Dashboard → SQL Editor:
```sql
SELECT * FROM flows WHERE workspace_id = 'seu-id';
```

### Como gerencio migrations?
1. Alterar schema em `supabase/migrations/001_initial_schema.sql`
2. Executar via Supabase SQL Editor
3. Ou usar Supabase CLI (futuro)

### Como vejo dados em tempo real?
Use Supabase Realtime:
```ts
supabase
  .from('flows')
  .on('*', (payload) => {
    console.log('Mudança:', payload)
  })
  .subscribe()
```

## Deployment

### Como faço deploy?
Ainda não está configurado. Opções:
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Backend**: Supabase (sem código extra necessário)

### Como uso variáveis de ambiente em produção?
Configure em seu host (Vercel, Netlify, etc).

## Debugging

### Como debugo?
1. Abra DevTools (F12)
2. Console para logs
3. Network para requests
4. React DevTools para componentes
5. Redux DevTools plugin (não estamos usando Redux, mas Zustand)

### Como vejo queries do Supabase?
No navegador, Network tab, procure por `supabase`.

## Contribuindo

### Como começo a contribuir?
1. Leia [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Procure por issues abertas
3. Crie uma branch
4. Faça pull request

### Quais são as prioridades?
1. Funcionalidade
2. Arquitetura
3. Segurança
4. Performance
5. UX
6. Extras

### Preciso fazer testes?
Ainda não há testes. Pode ser adicionado no futuro.

## Problemas Comuns

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### "VITE_SUPABASE_URL is undefined"
Verificar `.env.local`. Deve conter:
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
```

### TypeScript errors que não fazem sentido
```bash
npm run type-check
# Se mostrar erros "phantom", tente:
rm -rf node_modules .vite
npm install
npm run dev
```

### Build não funciona
```bash
npm run type-check    # Verificar tipos
npm run build         # Verificar build
```

## Contato

- 📧 Issues no GitHub/GitLab
- 💬 Discussions no repositório
- 📝 PRs com sugestões

---

**Última atualização**: 18/08/2026
