# AI Nodes — Nodes com Inteligência Artificial no Engine

## Contexto

A Fase 1 da Secretaria IA gera fluxos usando os 10 node types existentes (start,
text, question, button, condition, variable, delay, http, webhook, end). Esta
spec documenta os **AI Nodes**: node types que, durante a execução do fluxo no
engine, invocam um LLM para processar dados dinamicamente.

Esta spec é referência para fases futuras — não é implementação imediata.

## Por que AI Nodes?

Os nodes atuais são determinísticos: um node `text` sempre envia a mesma
mensagem; um node `condition` avalia uma expressão fixa. AI Nodes introduzem
capacidades que exigem inferência de linguagem natural em tempo de execução:

- **Classificar** a intenção de uma mensagem do cliente
- **Resumir** um histórico de conversa antes de decidir o próximo passo
- **Gerar respostas** personalizadas com base no contexto do negócio
- **Extrair dados** estruturados de texto livre (ex: CPF, pedido, endereço)
- **Traduzir** ou **reformular** mensagens conforme o tom da marca

Sem AI Nodes, a Secretaria IA só gera fluxos estáticos. Com eles, o agente
consegue operar de forma verdadeiramente autônoma.

## AI Node Types propostos

### 1. `ai_classify` — Classificar Intenção

Classifica um texto em uma das categorias fornecidas.

```typescript
interface AiClassifyConfig {
  input: string // expressão template com variáveis do fluxo (ex: "{{message}}")
  categories: string[] // ex: ["dúvida", "reclamação", "elogio", "compra"]
  fallback: string // categoria quando confiança for baixa
}
```

**Engine behavior:**
1. Resolve `input` com as variáveis de execução
2. Chama LLM com prompt: `Classifique o texto em uma das categorias: ${categories.join(", ")}`
3. Retorna `{ category: string, confidence: number }`
4. Salva resultado em variável do fluxo

**Edges de saída:** uma por categoria + uma para `fallback`

---

### 2. `ai_generate` — Gerar Texto

Gera texto via LLM com base em um prompt template e variáveis do fluxo.

```typescript
interface AiGenerateConfig {
  prompt: string // template com variáveis (ex: "Responda {{message}} no tom de {{agent_tone}}")
  systemPrompt?: string // instruções de sistema
  outputVariable: string // nome da variável onde salvar o resultado
  maxTokens?: number
}
```

**Engine behavior:**
1. Resolve `prompt` e `systemPrompt` com variáveis de execução
2. Chama LLM e captura resposta
3. Salva em `outputVariable` no contexto do fluxo

---

### 3. `ai_extract` — Extrair Dados Estruturados

Extrai campos estruturados de um texto livre usando JSON schema.

```typescript
interface AiExtractConfig {
  input: string // texto livre (ex: "{{message}}")
  schema: Record<string, unknown> // JSON schema do que extrair
  outputVariable: string
}
```

**Engine behavior:**
1. Resolve `input` com variáveis
2. Chama LLM com structured output forçado pelo `schema`
3. Salva objeto extraído em `outputVariable`

---

### 4. `ai_summarize` — Resumir Texto

Resumie um texto longo (ex: histórico de conversa).

```typescript
interface AiSummarizeConfig {
  input: string
  maxLength?: number // máximo de caracteres do resumo
  outputVariable: string
}
```

---

### 5. `ai_decision` — Decisão com Explicação

Similar ao `condition`, mas usa LLM para decidir o próximo passo com base em
contexto aberto. Retorna a decisão E o raciocínio.

```typescript
interface AiDecisionConfig {
  context: string // template com o contexto para decisão
  options: string[] // possíveis decisões
  reasoningVariable: string // onde salvar o porquê da decisão
}
```

**Edges de saída:** uma por opção

---

## Nodes que a IA utiliza para automatizar (Fase 1 vs Futuro)

### Fase 1 (atual) — Nodes usados na geração

A Secretaria IA gera fluxos usando estes nodes:

| Node | Uso na automação |
|------|------------------|
| `start` | Ponto de entrada do fluxo |
| `text` | Enviar mensagens estáticas (boas-vindas, informações) |
| `question` | Perguntar algo ao usuário e esperar resposta |
| `button` | Apresentar opções de escolha |
| `condition` | Ramificar por condições simples (ex: horário, canal) |
| `variable` | Definir/alterar variáveis de contexto |
| `delay` | Pausar execução (segundos/minutos) |
| `http` | Chamar API externa (webhook, CRM, planilha) |
| `webhook` | Aguardar callback externo |
| `end` | Finalizar o fluxo |

**Limitação atual:** toda lógica é estática. O node `text` não adapta a mensagem
ao cliente; o `condition` só avalia expressões determinísticas.

### Fase futura — AI Nodes que serão utilizados

Quando o engine suportar AI Nodes, a Secretaria IA poderá gerar fluxos com:

| AI Node | Substitui/complementa | Capacidade |
|---------|----------------------|------------|
| `ai_classify` | `condition` | Classifica intenção em linguagem natural |
| `ai_generate` | `text` | Gera respostas personalizadas por contexto |
| `ai_extract` | `question` | Extrai dados sem formulário estruturado |
| `ai_summarize` | — | Condensa histórico antes de decisão |
| `ai_decision` | `condition` | Decide com base em contexto aberto |

**Exemplo de fluxo híbrido (futuro):**
```
start → ai_classify (intenção) → [dúvida, reclamação, compra]
  ├─ dúvida → ai_generate (responder) → end
  ├─ reclamação → ai_extract (dados do pedido) → http (abrir chamado) → end
  └─ compra → ai_decision (qual produto?) → [pão, bolo, doce]
       ├─ pão → text → end
       ├─ bolo → text → end
       └─ doce → text → end
```

## Requisitos de engine para AI Nodes

Para suportar AI Nodes, o engine precisa:

1. **Execução assíncrona:** AI Nodes são bloqueantes (chamada de rede ao LLM).
   O engine precisa suportar `await` real e não bloquear a request HTTP.

2. **Contexto de execução persistente:** O estado do fluxo precisa sobreviver
   entre a chamada do AI Node e a retomada após a resposta do LLM.

3. **Integração LLM no engine:** O engine precisa de um cliente OpenAI (ou
   abstração) para chamar modelos durante a execução.

4. **Timeout e retry:** AI Nodes podem falhar (rate limit, rede). O engine
   precisa de política de retry e fallback.

5. **Custos e limites:** Chamadas LLM têm custo. O engine precisa de limites
   por execução (max tokens, max chamadas AI por fluxo).

## Fora de escopo desta spec

- Implementação dos AI Nodes (é trabalho de fase futura)
- Policy Engine e aprovação humana
- Memória operacional entre execuções
- Integrações reais (WhatsApp, e-mail, CRM)

## Critérios de aceitação (quando implementado)

1. Engine suporta nodes que chamam LLM em tempo de execução.
2. `ai_classify` retorna categoria + confiança e ramifica o fluxo.
3. `ai_generate` produz texto salvo em variável do fluxo.
4. `ai_extract` retorna objeto validado pelo schema fornecido.
5. `ai_decision` retorna decisão + explicação (auditável).
6. Timeout configurável por AI Node (padrão 10s).
7. Fallback configurável quando LLM falha.
8. Custo de tokens rastreável por execução.
