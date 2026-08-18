# Deploy no Dokploy

Este projeto tem três containers: `postgres`, `backend` (Express/API) e `frontend`
(build estático do Vite servido por nginx, que faz proxy de `/api` para o `backend`
dentro da rede interna). O arquivo usado em produção é `docker-compose.prod.yml`
(o `docker-compose.yml` na raiz é só para desenvolvimento local, com hot-reload).

## 1. Setup do container + database

1. No Dokploy, crie um novo **Project** e dentro dele uma **Application** do tipo
   **Docker Compose**, apontando para este repositório Git.
2. Configure o **Compose Path** para `docker-compose.prod.yml`.
3. Em **Environment Variables**, defina (Dokploy injeta essas vars no compose):

   | Variável | Descrição |
   |---|---|
   | `DB_USER` | usuário do Postgres (padrão `postgres`) |
   | `DB_PASSWORD` | senha forte, gerada uma vez — **não reaproveite** a de dev |
   | `DB_NAME` | nome do banco (padrão `zapiar_flow`) |
   | `JWT_SECRET` | string aleatória longa (ex.: `openssl rand -hex 32`) |
   | `JWT_EXPIRE` | ex.: `7d` |
   | `FRONTEND_URL` | domínio público do frontend, ex.: `https://app.seudominio.com` |

4. Em **Domains**, aponte o domínio público apenas para o serviço `frontend`,
   porta `80`. `backend` e `postgres` **não** devem ter domínio público — eles só
   são alcançados dentro da rede interna do compose (`backend:3001`, `postgres:5432`).
5. Deploy. O Postgres aplica `server/config/schema.sql` automaticamente na primeira
   subida (via `docker-entrypoint-initdb.d`), então não é necessário rodar migração
   manual.

## 2. SSL

O Dokploy provisiona certificado Let's Encrypt automaticamente para qualquer
domínio configurado na aba **Domains** da aplicação, desde que o DNS já aponte
para o servidor. Nada a fazer no código — só confirmar que o domínio está com
"HTTPS" habilitado nas configurações do domínio dentro do Dokploy.

## 3. Backups

Configure em **Databases → (seu Postgres) → Backups** no Dokploy:
- Agende backups periódicos (diário é um bom padrão) do volume `postgres_data`.
- Aponte o destino para um storage S3-compatible (Dokploy suporta isso nativamente).
- Faça um teste de restore pelo menos uma vez antes de confiar no agendamento.

## 4. Monitoramento

- O Dokploy expõe métricas básicas de CPU/memória/rede por serviço na aba
  **Monitoring** de cada aplicação — sem configuração adicional.
- Os healthchecks já definidos nos Dockerfiles (`/health` no backend, `/` no
  frontend) alimentam o status "healthy/unhealthy" que o Dokploy mostra e usa
  para decidir se reinicia o container.
- Para alertas (ex.: Slack/email quando um serviço cai), configure em
  **Notifications** no Dokploy apontando para os webhooks desejados.

## Variáveis de ambiente do frontend

O frontend é buildado com `VITE_API_URL=/api` (baked em build-time), porque o
nginx do próprio container faz proxy de `/api` para `backend:3001/api`. Isso
evita CORS em produção — o browser enxerga tudo como same-origin. Não é
necessário (nem recomendado) apontar o frontend direto para o domínio do
backend.
