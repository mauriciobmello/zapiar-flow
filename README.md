# Zapiar Flow

Plataforma visual de criação e execução de fluxos de trabalho, automações, chatbots e processos digitais.

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Docker (para o Postgres local)

### Instalação

1. Clone o repositório
```bash
git clone <repo-url>
cd zapiar-flow
```

2. Instale as dependências (frontend e backend)
```bash
npm install
cd server && npm install && cd ..
```

3. Configure variáveis de ambiente
```bash
cp .env.example .env.local   # frontend (Vite)
cp server/.env.example server/.env   # backend
```

O padrão de `.env.local` (`VITE_API_URL=http://localhost:3001/api`) já aponta
para o backend local — não precisa editar nada para rodar em dev.

4. Suba o Postgres + backend
```bash
docker-compose up -d
```
O schema (`server/config/schema.sql`) é aplicado automaticamente na primeira
subida do Postgres.

5. Inicie o frontend
```bash
npm run dev
```

Acesse http://localhost:3000

Veja [DEPLOY.md](DEPLOY.md) para o deploy em produção no Dokploy.

## 📁 Estrutura do Projeto

```
src/
├── app/                    # Componentes de aplicação global
├── components/             # Componentes reutilizáveis
├── features/              # Funcionalidades por domínio
│   ├── auth/             # Autenticação
│   ├── dashboard/        # Dashboard principal
│   ├── flows/            # Editor de fluxos
│   ├── executions/       # Histórico de execuções
│   └── integrations/     # Integrações
├── stores/               # Zustand stores (estado global)
├── hooks/                # React hooks customizados
├── lib/                  # Funções utilitárias
├── types/                # TypeScript types
├── utils/                # Utilitários gerais
└── engine/               # Flow Engine (execução de fluxos)
```

## 🏗️ Arquitetura

O projeto é dividido em 5 camadas principais:

1. **Flow Editor** — Interface visual para criar fluxos
2. **Flow Engine** — Execução dos fluxos
3. **Connectors** — Integrações externas
4. **Data Layer** — Persistência via API própria (Express + PostgreSQL)
5. **AI Layer** — Geração e edição assistida por IA (futuro)

## 📋 Roadmap (Sprints)

- [x] Sprint 1: Fundação (Auth, Workspace, Dashboard)
- [ ] Sprint 2: Editor e Canvas
- [ ] Sprint 3: Nodes do MVP
- [ ] Sprint 4: Persistência
- [ ] Sprint 5: Flow Engine
- [ ] Sprint 6: HTTP Requests
- [ ] Sprint 7: Flow Tester
- [ ] Sprint 8: Publicação e Versioning
- [ ] Sprint 9: Templates
- [ ] Sprint 10: IA

## 🔧 Tecnologias

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Router
- **State**: Zustand
- **Backend**: Express + PostgreSQL (JWT auth própria)
- **Build**: Vite
- **Editor**: React Flow

## 📚 Documentação

Ver `/Zapiar_Flow_SPEC.md` para a especificação completa do projeto.

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença MIT.
