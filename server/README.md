# Zapiar Flow - Backend Server

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

## 🚀 Instalação

### 1. Instalar dependências

```bash
cd server
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Editar `.env` com suas configurações:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=zapiar_flow
JWT_SECRET=sua-chave-secreta-aqui
```

### 3. Criar database e rodar migrations

```bash
# Criar database
createdb zapiar_flow

# Rodar schema
psql -U postgres -d zapiar_flow -f config/schema.sql
```

## 💻 Development

```bash
# Rodar em modo desenvolvimento (com hot reload)
npm run dev

# Compilar TypeScript
npm run build

# Rodar production
npm start
```

## 📡 API Endpoints

### Autenticação

- `POST /api/auth/signup` - Criar conta
- `POST /api/auth/signin` - Fazer login
- `GET /api/auth/profile` - Obter perfil (requer token)

### Workspaces

- `GET /api/workspaces` - Listar workspaces do usuário
- `POST /api/workspaces` - Criar workspace
- `GET /api/workspaces/:id` - Obter workspace específico

### Fluxos

- `GET /api/flows?workspaceId=X` - Listar fluxos
- `POST /api/flows` - Criar fluxo
- `GET /api/flows/:id` - Obter fluxo
- `PATCH /api/flows/:id` - Atualizar fluxo
- `DELETE /api/flows/:id` - Deletar fluxo

### Definições de Fluxo

- `GET /api/flows/:flowId/definition` - Obter definição
- `POST /api/flows/:flowId/definition` - Salvar definição
- `POST /api/flows/:flowId/publish` - Publicar fluxo
- `GET /api/flows/:flowId/versions` - Obter histórico

## 🐳 Docker

### Com docker-compose (recomendado)

```bash
# Na raiz do projeto
docker-compose up -d

# Parar
docker-compose down
```

O backend estará em `http://localhost:3001`
O PostgreSQL estará em `localhost:5432`

### Build customizado

```bash
docker build -t zapiar-flow-backend .
docker run -p 3001:3001 --env-file .env zapiar-flow-backend
```

## 🔐 Autenticação

O backend usa JWT (JSON Web Tokens). Após login, envie o token em todas as requisições:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/auth/profile
```

## 📚 Estrutura

```
server/
├── src/
│   ├── index.ts              # Entry point
│   ├── db/
│   │   └── connection.ts      # Pool de conexões
│   ├── middleware/
│   │   └── auth.ts            # JWT middleware
│   ├── controllers/
│   │   ├── auth.ts
│   │   ├── workspace.ts
│   │   ├── flow.ts
│   │   └── flowDefinition.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── workspace.ts
│   │   ├── flow.ts
│   │   └── flowDefinition.ts
│   └── utils/
│       └── jwt.ts
├── config/
│   └── schema.sql            # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

## 🧪 Testes

```bash
# (Em desenvolvimento)
npm test
```

## 🔍 Troubleshooting

### Erro de conexão ao PostgreSQL

```bash
# Verificar se postgres está rodando
psql -U postgres -d postgres -c "SELECT version();"

# Se usar docker-compose, verificar:
docker-compose logs postgres
```

### Erro 401 - Unauthorized

- Verificar se token está sendo enviado corretamente
- Verificar se JWT_SECRET é o mesmo no .env
- Verificar se token não expirou

### Erro 403 - Access Denied

- Verificar se o usuário é membro do workspace
- Verificar permissões no banco

## 📝 Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NODE_ENV` | development | Ambiente |
| `PORT` | 3001 | Porta do servidor |
| `DB_HOST` | localhost | Host do PostgreSQL |
| `DB_PORT` | 5432 | Porta do PostgreSQL |
| `DB_USER` | postgres | Usuário do PostgreSQL |
| `DB_PASSWORD` | postgres | Senha do PostgreSQL |
| `DB_NAME` | zapiar_flow | Nome do database |
| `JWT_SECRET` | (obrigatório) | Chave secreta JWT |
| `JWT_EXPIRE` | 7d | Expiração do token |
| `FRONTEND_URL` | http://localhost:3000 | URL do frontend (CORS) |

## 🚀 Deploy com Dokploy

1. Push código para repositório Git
2. Criar novo deployment no Dokploy
3. Configurar variáveis de ambiente
4. Dokploy fará build automático e deployment

### Checklist de Deploy

- [ ] JWT_SECRET diferente de padrão
- [ ] DB_PASSWORD diferente de padrão
- [ ] FRONTEND_URL apontando para domínio correto
- [ ] DATABASE em serviço externo ou RDS
- [ ] HTTPS habilitado
- [ ] Logs configurados
- [ ] Backup de dados configurado

## 📞 Suporte

Para dúvidas sobre o servidor, consulte a documentação do projeto ou crie uma issue.
