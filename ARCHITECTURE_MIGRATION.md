# 🔄 Migração para Backend Local com PostgreSQL

## 📊 Alterações de Arquitetura

### De: Supabase (BaaS)
```
Frontend (React) 
    ↓ (chamadas diretas)
Supabase (Firebase-like)
    ↓
PostgreSQL gerenciado na nuvem
```

### Para: Backend Local + PostgreSQL
```
Frontend (React) 
    ↓ (chamadas HTTP)
Express Backend (Node.js)
    ↓ (SQL queries)
PostgreSQL local (mesmo servidor)
```

## ✅ O que foi implementado

### 1. **Backend Express** (`/server`)

#### Estrutura
```
server/
├── src/
│   ├── index.ts                    # Entry point
│   ├── db/connection.ts            # Pool PostgreSQL
│   ├── middleware/auth.ts          # JWT middleware
│   ├── controllers/
│   │   ├── auth.ts                 # Sign up/in
│   │   ├── workspace.ts            # Workspace CRUD
│   │   ├── flow.ts                 # Flow CRUD
│   │   └── flowDefinition.ts       # Save/publish/version
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── workspace.ts
│   │   ├── flow.ts
│   │   └── flowDefinition.ts
│   └── utils/jwt.ts                # Token generation
├── config/schema.sql               # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

#### Stack
- **Framework**: Express.js
- **Language**: TypeScript
- **Auth**: JWT (JSON Web Tokens)
- **Database**: PostgreSQL 15 (pg client)
- **Security**: bcryptjs para hash de senha

### 2. **Autenticação JWT**

Fluxo:
```
1. User sign up/sign in
   ↓
2. Backend valida credentials
   ↓
3. Gera JWT token (7 dias)
   ↓
4. Frontend armazena em localStorage
   ↓
5. Frontend envia em cada request (Authorization: Bearer <token>)
   ↓
6. Backend verifica token + extrai userId
   ↓
7. Processa request com contexto do user
```

### 3. **Database Schema**

Mudança importante: sem dependência do `auth.users` do Supabase

**Antes (Supabase):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),  -- Referência ao Supabase Auth
  ...
)
```

**Agora (PostgreSQL Local):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash TEXT NOT NULL,  -- Gerenciamos senha
  ...
)
```

### 4. **API Endpoints**

#### Auth
- `POST /api/auth/signup` - Criar conta + workspace padrão
- `POST /api/auth/signin` - Login + token JWT
- `GET /api/auth/profile` - Perfil do usuário (protegido)

#### Workspaces
- `GET /api/workspaces` - Listar workspaces do user
- `POST /api/workspaces` - Criar novo workspace
- `GET /api/workspaces/:id` - Obter workspace

#### Flows
- `GET /api/flows?workspaceId=X` - Listar fluxos
- `POST /api/flows` - Criar fluxo
- `GET /api/flows/:id` - Obter fluxo
- `PATCH /api/flows/:id` - Atualizar (nome, status)
- `DELETE /api/flows/:id` - Deletar

#### Flow Definitions
- `GET /api/flows/:flowId/definition` - Carregar definição
- `POST /api/flows/:flowId/definition` - Salvar definição (auto-upsert)
- `POST /api/flows/:flowId/publish` - Publicar com versionamento
- `GET /api/flows/:flowId/versions` - Histórico de versões

### 5. **Docker & Dokploy**

#### Docker Compose (desenvolvimento)
```bash
docker-compose up -d
```

Inicia:
- ✅ PostgreSQL 15 (porta 5432)
- ✅ Express Backend (porta 3001)
- Volume: banco persiste em `postgres_data/`

#### Dockerfile (production)
- Multi-stage build (reduz tamanho)
- Non-root user (segurança)
- Health check incluído
- Pronto para Dokploy

#### Variáveis de Ambiente
```
NODE_ENV=production
PORT=3001
DB_HOST=postgres (ou RDS em prod)
DB_USER=postgres
DB_PASSWORD=***
DB_NAME=zapiar_flow
JWT_SECRET=***
FRONTEND_URL=https://seu-dominio.com
```

## 🔐 Segurança

1. **Senhas**: Hashed com bcryptjs (salt: 12)
2. **Tokens**: JWT signed com chave secreta
3. **CORS**: Restrito ao FRONTEND_URL
4. **Rate limiting**: (A implementar em prod)
5. **HTTPS**: Dokploy fornece SSL automático

## 🚀 Como usar

### Desenvolvimento Local

```bash
# 1. Setup
cd server
npm install
cp .env.example .env

# 2. Com Docker Compose (recomendado)
cd ..
docker-compose up -d

# 3. Ou manualmente
npm run dev  # no server/

# Backend estará em http://localhost:3001
# Frontend em http://localhost:3000 (Vite)
```

### Deploy com Dokploy

```bash
# 1. Push código para Git
git push origin main

# 2. No Dokploy:
# - Criar novo deployment
# - Conectar repositório
# - Setar variáveis de ambiente
# - Deploy automático!

# 3. Dokploy fará:
# - Build Docker automaticamente
# - Deploy container
# - Setup SSL/HTTPS
# - Monitoramento
```

## 📝 Próximos Passos

### Fase 1: Adaptar Frontend
- [x] Criar API client (src/lib/api.ts)
- [x] Trocar Supabase pelos endpoints
- [x] Testar autenticação (signup, signin, senha errada, profile — via backend real + Postgres embarcado)
- [x] Testar CRUD de fluxos (workspaces, flows, definition save/load, publish/versioning, delete, controle de acesso entre usuários)

### Fase 2: Produção
- [x] Dockerfile do backend corrigido (não instalava mais as deps do frontend à toa)
- [x] Dockerfile.frontend + nginx.conf (build do Vite servido via nginx, proxy same-origin para `/api`)
- [x] docker-compose.prod.yml (postgres + backend + frontend, pronto para Dokploy)
- [x] Ver [DEPLOY.md](DEPLOY.md) para os passos exatos no Dokploy — setup, domínio/SSL, backups, monitoramento
- [ ] Executar o deploy real no Dokploy (requer acesso ao painel/servidor do usuário)

### Fase 3: Features
- [ ] Rate limiting
- [ ] Logging estruturado
- [ ] Cache (Redis)
- [ ] File uploads (para exportar fluxos)

## 🔄 Comparação Supabase vs Local

| Feature | Supabase | Local + PostgreSQL |
|---------|----------|-------------------|
| **Auth** | Gerenciado | Implementado (JWT) |
| **Database** | Gerenciado (cloud) | Local (mesmo servidor) |
| **Custo** | Pay-as-you-go | Infraestrutura fixa |
| **Escala** | Ilimitada | Limitada ao servidor |
| **Latência** | Internet | Local (rápido) |
| **Backup** | Automático | Manual (setup) |
| **RLS** | Native | Application-level |
| **Deploy** | Automático | Dokploy |

## 📊 Arquitetura Final

```
Internet
   ↓
[Dokploy Load Balancer + SSL]
   ↓
[Express Backend Container]
   ├─ Porta 3001
   ├─ Node.js 20
   └─ TypeScript
   ↓
[PostgreSQL Container]
   ├─ Porta 5432
   └─ Volume: postgres_data
   ↓
[Volumes Persistentes]
   └─ Database files
```

## 🧪 Testes

```bash
# Teste de autenticação
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Teste de health check
curl http://localhost:3001/health

# Teste com token
curl http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📚 Referências

- [Express Documentation](https://expressjs.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [JWT.io](https://jwt.io)
- [Dokploy Documentation](https://dokploy.com)
- [Docker Documentation](https://docs.docker.com)

---

**Status**: ✅ Backend pronto para integração com frontend

**Próximo**: Adaptar frontend para chamar API local
