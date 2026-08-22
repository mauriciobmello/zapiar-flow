# Secretaria IA — Fase 1 (Business Profile + Flow Generator)

## Contexto

O documento `Zapiar_Flow_Secretaria_IA_SPEC.md` descreve uma evolução ampla do
Zapiar Flow em direção a uma "Secretaria IA" com onboarding conversacional,
geração de fluxos por linguagem natural, camada de IA nos nodes, Policy
Engine, aprovação humana, memória de negócio e integrações (e-mail, WhatsApp,
CRM). Essa spec cobre 5 fases; este documento trata **apenas da Fase 1**,
delimitada em conversa com o usuário.

Estado atual do projeto (levantado antes deste design):

- Frontend: React 18 + TypeScript + Zustand + React Flow, em `src/`.
- Backend: Express + PostgreSQL (`pg`), JWT próprio, em `server/src/`.
- Engine de execução (`server/src/engine/executor.ts`): função `advance()`
  **síncrona**, chamada por request HTTP, que anda pelo grafo até parar num
  nó que espera input humano (`question`/`button`/`webhook`) ou terminar.
  Não há execução em background, fila ou agendamento.
- 10 node types existentes: `start, text, question, button, condition,
  variable, delay, http, webhook, end` (`ComponentLibrary.tsx`).
- Schema atual: `users, workspaces, workspace_members, flows,
  flow_definitions, flow_versions, executions, execution_logs, credentials`.
- Nenhuma dependência de LLM no projeto hoje.
- Não existe (ainda) uma "SPEC de WhatsApp anterior" referenciada pelo
  documento da Secretaria IA — confirmado com o usuário, não é bloqueio
  desta fase.

## Objetivo da Fase 1

Permitir que um usuário descreva sua empresa em linguagem natural e receba,
ao final, um fluxo visual publicável no editor já existente — sem alterar o
motor de execução nem introduzir node types novos.

Fora de escopo desta fase (decisões explícitas do usuário):
- Motor de execução assíncrono / triggers proativos (agendador, "novo
  e-mail").
- Nodes de IA dentro do engine (classificar, resumir, gerar resposta em
  tempo de execução).
- Policy Engine, aprovação humana, memória operacional, auditoria dedicada.
- Integrações reais (e-mail, WhatsApp, CRM).
- Edição do fluxo gerado por linguagem natural (spec seção 24) — fica para
  uma fase seguinte; nesta fase a edição pós-geração é manual, no Canvas
  já existente.

## Decisões de escopo confirmadas com o usuário

1. **`secretary_agents` é criada já nesta fase** (não só `business_profiles`
   + um `flow` solto), para não exigir migração de schema quando autonomia/
   política entrarem em fases futuras.
2. **Onboarding é conversacional multi-turno**: a IA pode fazer perguntas de
   acompanhamento até montar um `BusinessProfile` completo.
3. **Sem persistência de sessão de onboarding no servidor** (Abordagem 1):
   o frontend mantém o histórico da conversa em estado local e reenvia tudo
   a cada turno; o backend só grava algo no banco quando o perfil está
   completo e o usuário decide gerar o fluxo.
4. **Provedor de IA: OpenAI**, via SDK oficial, usando structured outputs
   (`response_format: json_schema`) para extrair `BusinessProfile` e gerar
   `FlowDefinition` como JSON tipado, não texto livre parseado por regex.

## Modelo de dados

Migration nova em `server/config/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  segment TEXT NOT NULL,
  subsegment TEXT,
  business_model TEXT,
  customers TEXT[],
  products TEXT[],
  services TEXT[],
  channels TEXT[],
  departments TEXT[],
  business_hours JSONB,
  operational_processes TEXT[],
  communication_style TEXT,
  restrictions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS secretary_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  autonomy_level TEXT NOT NULL CHECK (autonomy_level IN ('assistida', 'semi_autonoma', 'autonoma')) DEFAULT 'assistida',
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused')) DEFAULT 'draft',
  system_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_workspace_id ON business_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_secretary_agents_workspace_id ON secretary_agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_secretary_agents_business_profile_id ON secretary_agents(business_profile_id);
```

`autonomy_level` e `system_instructions` são armazenados desde já (a spec
maior já define esses campos) mas **não são aplicados** por nenhuma lógica
nesta fase — só passam a valer quando o Policy Engine existir. `flow_id` é
nullable e populado no momento da geração do fluxo.

Tipos TypeScript correspondentes (novo arquivo `server/src/models/secretary.ts`
e espelho em `src/types/index.ts`):

```typescript
export interface BusinessProfile {
  id: string
  workspaceId: string
  businessName: string
  segment: string
  subsegment?: string
  businessModel?: string
  customers: string[]
  products?: string[]
  services?: string[]
  channels: string[]
  departments?: string[]
  businessHours?: unknown
  operationalProcesses?: string[]
  communicationStyle?: string
  restrictions?: string[]
}

export interface SecretaryAgent {
  id: string
  workspaceId: string
  businessProfileId: string
  flowId: string | null
  name: string
  description?: string
  autonomyLevel: 'assistida' | 'semi_autonoma' | 'autonoma'
  status: 'draft' | 'active' | 'paused'
  systemInstructions?: string
}
```

## Serviço de IA

Novo módulo `server/src/services/openai.ts`, wrapper fino sobre o SDK
oficial da OpenAI. Lê `OPENAI_API_KEY` do ambiente; a ausência dela falha o
boot do servidor (mesmo padrão de validação já usado para `JWT_SECRET`), não
silenciosamente em runtime. Nova entrada em `server/.env.example`.

Três funções, todas usando structured outputs para forçar JSON tipado:

```typescript
discoverBusinessProfile(messages: { role: 'user' | 'assistant'; content: string }[]):
  Promise<
    | { status: 'needs_info'; question: string }
    | { status: 'complete'; profile: BusinessProfile }
  >

generateFlow(profile: BusinessProfile, request: string): Promise<FlowDefinition>

explainFlow(definition: FlowDefinition): Promise<string>
```

Para `generateFlow`, o JSON schema enviado à OpenAI restringe `node.type` a
um enum fechado com os 10 tipos hoje suportados pelo engine. Mesmo assim, o
backend valida o resultado antes de persistir (`validateFlowDefinition()`,
função pura e testável sem rede):

- todo `node.type` está no allowlist dos 10 tipos existentes;
- todo `edge.source`/`edge.target` aponta para um `node.id` existente na
  definição;
- existe exatamente um node do tipo `start`.

Se a validação falhar, o backend tenta novamente **uma vez** com um prompt
corretivo citando o erro específico. Se falhar de novo, retorna `422` com uma
mensagem pedindo para o usuário reformular o pedido — sem persistir nada.

## Endpoints

Novo `server/src/routes/secretary.ts` + `server/src/controllers/secretary.ts`,
seguindo o padrão de `flow.ts`/`workspace.ts` (rotas protegidas pelo
middleware JWT existente, workspace resolvido do body/params como já é feito
hoje).

```
POST /api/secretary/discover
  body: { messages: [...] }
  → resposta de discoverBusinessProfile(). Não grava nada no banco, então
    não precisa de workspaceId — só autenticação (JWT) para não expor o
    endpoint anonimamente.

POST /api/secretary/agents
  body: { workspaceId, profile: BusinessProfile, request: string }
  → cria, em uma transação:
      business_profiles (a partir de profile)
      secretary_agents (status 'draft', autonomy_level 'assistida')
      flows (status 'draft')
      flow_definitions (com o FlowDefinition gerado por generateFlow)
  → { agentId, flowId }

GET /api/secretary/agents/:id
  → agente + perfil associado (para a tela de revisão)

POST /api/secretary/agents/:id/explain
  → chama explainFlow() sobre a flow_definition atual do flow do agente
  → { explanation: string }
```

`POST /api/secretary/agents` é o único ponto de escrita no banco desta fase
— consistente com a decisão de onboarding sem persistência de sessão. A
partir daí, editar/simular/publicar o flow usa as rotas de `flow` e
`flowDefinition` **já existentes**, sem duplicação.

## Frontend

Novo diretório `src/features/secretary/`, seguindo o padrão de
`features/flows`:

- `Onboarding.tsx` — chat simples (mensagens da IA + input de texto).
  Mantém `messages[]` em estado local (`useState`), chama `POST /discover`
  a cada envio. Enquanto `status === 'needs_info'`, mostra a pergunta e
  espera resposta. O backend limita a 8 turnos; se estourar, força
  `status: 'complete'` com o que já tiver coletado, para evitar loop
  infinito de perguntas.
- `ProfileReview.tsx` — mostra o `BusinessProfile` extraído em formulário
  editável (inputs simples, sem lib nova) e um campo de texto livre: "O que
  você quer que a secretaria faça?". Botão "Gerar Fluxo" chama
  `POST /secretary/agents`.
- Sem tela de resultado própria — a resposta de `POST /secretary/agents`
  devolve `flowId`; o front navega direto para a rota do `FlowEditor` já
  existente (`/flows/:flowId`), que já tem Simular/Editar/Publicar.

Entrada: botão "Criar Secretaria IA" no `Dashboard.tsx` atual, ao lado de
"Novo Fluxo", levando para `/secretary/new`.

`src/lib/api.ts` ganha `secretaryApi.discover()`, `.createAgent()`,
`.explain()`, no mesmo padrão das funções que já existem ali para `flow`.

## Tratamento de erro

- Falha na chamada à OpenAI (rede/rate limit) → `502`; front mostra "Não
  consegui processar agora, tente de novo" com retry — sem perder o
  histórico da conversa (que vive no state do front).
- `FlowDefinition` inválida após a 2ª tentativa → `422` com mensagem
  específica; front reabre o campo do pedido original, editável.
- `OPENAI_API_KEY` ausente → falha no boot do servidor, não em runtime.

## Testes

- `validateFlowDefinition()` — função pura, testável sem chamar a OpenAI de
  verdade (allowlist de node types, edges válidas, exatamente um `start`).
- Chamadas à OpenAI mockadas nos testes de controller (não bater na API real
  em CI).
- Smoke test manual (com chave real) antes de considerar a fase pronta:
  onboarding completo → perfil → fluxo gerado → abre no Canvas → simula →
  publica.

## Critérios de aceitação desta fase

1. Usuário descreve a empresa em linguagem natural pelo onboarding
   conversacional.
2. Sistema identifica segmento e monta um `BusinessProfile` completo,
   perguntando o que faltar.
3. Usuário revisa/edita o perfil antes de prosseguir.
4. Usuário descreve o que quer automatizar; sistema gera um `FlowDefinition`
   usando apenas os node types já existentes.
5. Fluxo abre no Canvas existente, pronto para editar manualmente.
6. Usuário consegue pedir uma explicação em linguagem natural do fluxo
   gerado.
7. Usuário simula e publica o fluxo usando os fluxos de trabalho já
   existentes no editor (sem mudança nenhuma neles).
