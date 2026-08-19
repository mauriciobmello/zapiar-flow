# Deploy no Dokploy

Um único container: o Express serve a API em `/api/*` e os arquivos estáticos
do build do Vite em tudo o mais (com fallback de SPA para as rotas do React
Router). Sem nginx, sem docker-compose em produção — só o `Dockerfile` da raiz
e um banco Postgres.

(O `docker-compose.yml` na raiz continua existindo só para desenvolvimento
local — sobe Postgres + backend com hot-reload. Não é usado em produção.)

## 1. Banco de dados

1. No Dokploy, dentro do seu **Project**, crie um **Database** do tipo
   **Postgres** (recurso nativo do Dokploy, não faz parte da aplicação).
2. Anote host interno, porta, usuário, senha e nome do banco que o Dokploy
   gerar — vai precisar deles no passo 3.
3. Aplique o schema uma vez (o Dokploy não faz isso sozinho para bancos
   criados assim, diferente de um Postgres definido dentro de um
   docker-compose). Duas formas:
   - Pelo **SQL Console** do próprio recurso de banco no Dokploy, se tiver
     um: cole o conteúdo de `server/config/schema.sql`.
   - Ou via `psql`, de qualquer máquina com acesso à porta do banco:
     ```bash
     psql "postgresql://<usuario>:<senha>@<host>:<porta>/<database>" \
       -f server/config/schema.sql
     ```

## 2. Aplicação

1. Crie uma **Application** do tipo **Dockerfile** (não Docker Compose),
   apontando para este repositório Git. O Dockerfile da raiz builda frontend
   e backend juntos.
2. Em **Environment Variables**:

   | Variável | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `DB_HOST` | host do banco criado no passo 1 |
   | `DB_PORT` | porta do banco (normalmente `5432`) |
   | `DB_USER` | usuário do banco |
   | `DB_PASSWORD` | senha do banco |
   | `DB_NAME` | nome do banco |
   | `JWT_SECRET` | string aleatória longa (`openssl rand -hex 32`) |
   | `JWT_EXPIRE` | `7d` |
   | `FRONTEND_URL` | o próprio domínio público desta app, ex.: `https://app.seudominio.com` |

3. Em **Domains**, aponte o domínio público para esta aplicação, **Container
   Port `3001`** (é a porta que o `EXPOSE`/`PORT` do Dockerfile usa — não
   `3000`, que é só o valor padrão sugerido pelo Dokploy).
4. Deploy.

## 3. SSL

O Dokploy provisiona certificado Let's Encrypt automaticamente para qualquer
domínio configurado em **Domains**, desde que o DNS já aponte para o
servidor. Só confirmar que "HTTPS" está habilitado nas configurações do
domínio.

## 4. Backups

Configure em **Databases → (seu Postgres) → Backups** no Dokploy:
- Agende backups periódicos (diário é um bom padrão).
- Aponte o destino para um storage S3-compatible (Dokploy suporta
  nativamente).
- Teste um restore pelo menos uma vez antes de confiar no agendamento.

## 5. Monitoramento

- O Dokploy expõe métricas básicas de CPU/memória/rede na aba **Monitoring**
  da aplicação, sem configuração adicional.
- O healthcheck do `Dockerfile` (`GET /health`) alimenta o status
  "healthy/unhealthy" que o Dokploy usa para decidir se reinicia o
  container.
- Para alertas (Slack/email quando o serviço cai), configure em
  **Notifications** no Dokploy.
