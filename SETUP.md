# Setup Completo do Zapiar Flow

## Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta no Supabase (gratuita em https://supabase.com)
- Git

## Passo 1: Preparar Supabase

### 1.1 Criar Projeto no Supabase
1. Acesse https://supabase.com/dashboard
2. Clique em "New project"
3. Selecione sua organização
4. Escolha um nome para o projeto
5. Defina uma senha segura
6. Selecione a região mais próxima
7. Clique em "Create new project" e aguarde (~2 min)

### 1.2 Configurar Banco de Dados
1. No dashboard, vá para **SQL Editor**
2. Clique em "New query"
3. Copie todo o conteúdo de `supabase/migrations/001_initial_schema.sql`
4. Cole no SQL Editor
5. Clique em "Run"
6. Confirme que as tabelas foram criadas

### 1.3 Obter Credenciais
1. Vá para **Settings** → **API**
2. Copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

## Passo 2: Configurar Projeto Local

### 2.1 Clonar/Inicializar Repositório
```bash
cd /Users/mauricio/zapiar-flow
```

### 2.2 Instalar Dependências
```bash
npm install
```

### 2.3 Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env.local
```

Editar `.env.local`:
```
VITE_SUPABASE_URL=https://[seu-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=http://localhost:3001
```

### 2.4 Validar Setup
```bash
# Verificar TypeScript
npm run type-check

# Fazer build
npm run build

# Resultado esperado:
# ✓ built in X.XXs
# dist/index.html                   0.49 kB │ gzip:   0.33 kB
# dist/assets/index-*.css           XX.XX kB │ gzip:   X.XX kB
# dist/assets/index-*.js           XXX.XX kB │ gzip: XXX.XX kB
```

## Passo 3: Executar Aplicação

### 3.1 Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```

Você verá algo como:
```
VITE v5.4.21  ready in 123 ms

➜  Local:   http://localhost:3000/
➜  press h to show help
```

### 3.2 Abrir no Navegador
1. Acesse http://localhost:3000
2. Você deve ver a página de login

## Passo 4: Testar Funcionalidades

### 4.1 Criar Conta
1. Na página de login, clique em "Não tem conta? Criar agora"
2. Preencha:
   - Nome: Seu nome
   - Email: seu@email.com
   - Senha: senha segura (min. 8 caracteres)
3. Clique em "Criar Conta"
4. Você será redirecionado para o Dashboard

### 4.2 Criar Workspace
1. Clique em "+ Novo Workspace"
2. Digite um nome (ex: "Workspace Principal")
3. Clique em "Criar"
4. O workspace aparecerá na lista

### 4.3 Criar Primeiro Fluxo
1. Clique em "+ Novo Fluxo"
2. Você será redirecionado para o editor
3. Você verá:
   - **Painel esquerdo**: Biblioteca de componentes
   - **Centro**: Canvas vazio (arrastador)
   - **Painel direito**: Propriedades (vazio até selecionar um nó)

### 4.4 Usar o Editor
1. Arraste um componente "Início" do painel esquerdo para o canvas
2. Arraste um "Mensagem" abaixo
3. Clique em um nó para editar suas propriedades no painel direito
4. Clique entre os nós para conectá-los
5. Mudanças são salvas automaticamente

## Troubleshooting

### Erro: "Missing Supabase environment variables"
```bash
# Verificar se .env.local existe
ls -la .env.local

# Verificar conteúdo
cat .env.local

# Deve conter:
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

### Erro: "Cannot connect to database"
```bash
# Verificar se o SQL foi executado no Supabase
# Ir para Supabase Dashboard → SQL Editor
# Executar: SELECT COUNT(*) FROM users;
# Deve retornar 0 (nenhum erro)
```

### Erro: "Module not found"
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Limpar cache
npm cache clean --force
```

### Aplicação não recarrega após mudanças
```bash
# Parar servidor (Ctrl + C)
# Iniciar novamente
npm run dev

# Em último caso, limpar cache
rm -rf dist .vite
npm run dev
```

## Estrutura de Arquivos

```
/Users/mauricio/zapiar-flow/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── types/
│   ├── stores/
│   ├── components/
│   ├── features/
│   ├── lib/
│   └── utils/
├── supabase/
│   └── migrations/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── .gitignore
├── README.md
├── DEVELOPMENT.md
└── SETUP.md (este arquivo)
```

## Próximas Ações Recomendadas

1. **Testar fluxo completo**: Criar um fluxo simples e verificar se salva
2. **Explorar componentes**: Draggear cada tipo de nó e editar propriedades
3. **Estudar código**: Revisar estrutura do projeto em `DEVELOPMENT.md`
4. **Implementar Sprint 3**: Sincronizar nodes com banco de dados

## Suporte

- 📖 Ver [DEVELOPMENT.md](./DEVELOPMENT.md) para desenvolvimento
- 📋 Ver [Zapiar_Flow_SPEC.md](./Zapiar_Flow_SPEC.md) para especificação
- 🔗 [Documentação React Flow](https://reactflow.dev)
- 🔗 [Documentação Supabase](https://supabase.com/docs)

## ✅ Você está pronto!

O projeto Zapiar Flow está configurado e funcionando. A arquitetura base está implementada e pronta para expansão. Próximo passo: executar `npm run dev` e começar a construir fluxos! 🚀
