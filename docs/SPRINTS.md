# Between Us — Estado dos Sprints

## ✅ Completos

| Sprint | Descrição | Data |
|---|---|---|
| 0.1 | Setup infraestrutura (Railway, PostgreSQL, Redis) | Jun 28 2026 |
| 1.1 | Autenticação (registo, login, JWT, logout) | Jun 28 2026 |
| 1.2 | Consentimento & RGPD (termos, age gate) | Jun 28 2026 |
| 2.1 | Perfil individual (criar, editar, intenções) | Jun 28 2026 |
| 2.2 | Perfil de casal (Double Consent Match) | Jun 28 2026 |
| 2.4 | Upload de fotos (S3/R2 + Soft Reveal) | Jun 28 2026 |
| 3.1 | Discovery feed (perfis reais da BD) | Jun 28 2026 |
| 3.2 | Between Score (algoritmo de compatibilidade) | Jun 28 2026 |
| 3.3 | Likes & Matches reais (match mútuo automático) | Jun 28 2026 |
| 4.1 | Chat real (mensagens na BD, sala privada) | Jun 28 2026 |
| 5.1 | Privacidade (Modo Invisível, toggles) | Jun 28 2026 |
| 5.2 | Bloqueio de contactos (hash RGPD) | Jun 28 2026 |
| 5.3 | Denúncias (reportar perfis e mensagens) | Jun 28 2026 |
| 5.4 | Verificação de perfil (selfie) | Jun 28 2026 |
| 6.1 | Painel Admin (stats, users, reports) | Jun 28 2026 |
| 7.1 | Subscrições (planos Free/Premium/Casal) | Jun 28 2026 |
| 7.1b | Stripe real (checkout, webhooks, portal) | Jun 28 2026 |

| 8.1 | Travel Mode (backend + frontend) | Jun 29 2026 |
| 9.1 | Beta fechado (BetaInvite, BETA_CLOSED env, gate no registo) | Jun 29 2026 |
| 8.2 | Consent Check (modal antes da primeira mensagem, 4 pontos) | Jun 29 2026 |
| 8.4 | Check-in de encontro (registo, confirmação, alerta de segurança) | Jun 29 2026 |

## 🔜 Próximos

| Sprint | Descrição | Prioridade |
|---|---|---|
| 9.2 | Lançamento v1.0 (polish, testes, deploy final) | Alta |

## API Endpoints activos

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- GET  /api/auth/me
- POST /api/auth/password/forgot

### Profiles
- POST /api/profiles
- GET  /api/profiles/me
- GET  /api/profiles/:id
- PUT  /api/profiles/:id
- PUT  /api/profiles/:id/boundaries
- PUT  /api/profiles/:id/privacy

### Discovery
- GET  /api/discovery
- POST /api/discovery/:id/like
- POST /api/discovery/:id/pass

### Matches
- GET  /api/matches
- GET  /api/matches/:id/messages
- POST /api/matches/:id/messages

### Privacy
- GET  /api/privacy
- PUT  /api/privacy
- POST /api/privacy/block/:profileId

### Reports
- POST /api/reports

### Admin
- GET  /api/admin/stats
- GET  /api/admin/users
- PUT  /api/admin/users/:id/status
- GET  /api/admin/reports
- PUT  /api/admin/reports/:id

### Subscriptions
- GET  /api/subscriptions/plans
- GET  /api/subscriptions/me
- POST /api/subscriptions/checkout
- POST /api/subscriptions/portal
- POST /api/subscriptions/upgrade
- POST /api/subscriptions/cancel

### Couples
- POST /api/couples
- GET  /api/couples/me
- PUT  /api/couples/me
- DELETE /api/couples/me
- POST /api/couples/join/:token
- POST /api/couples/matches/:matchId/approve

### Photos
- POST /api/photos
- GET  /api/photos/me
- PUT  /api/photos/:id
- DELETE /api/photos/:id
- POST /api/photos/:id/request-access

### Contacts
- POST /api/contacts/block
- GET  /api/contacts/blocked/count
- DELETE /api/contacts/blocked

### Verifications
- GET  /api/verifications/me
- POST /api/verifications/submit
- GET  /api/verifications/pending (admin)
- PUT  /api/verifications/:userId/review (admin)

### Webhooks
- POST /api/webhooks/stripe

### Travel Mode
- GET  /api/travel
- POST /api/travel
- PUT  /api/travel/:id
- DELETE /api/travel/:id
- GET  /api/travel/discovery?city=&startDate=&endDate=

### Check-in de Encontro
- POST /api/checkin/start
- POST /api/checkin/:id/confirm
- POST /api/checkin/:id/cancel
- GET  /api/checkin/me

### Beta (acesso fechado)
- GET  /api/beta/check/:code
- POST /api/beta/redeem
- GET  /api/beta/invites (admin)
- POST /api/beta/invites (admin)
- PUT  /api/beta/invites/:id (admin)
- DELETE /api/beta/invites/:id (admin)
- GET  /api/beta/stats (admin)

## Variáveis de ambiente relevantes

| Variável | Descrição |
|---|---|
| BETA_CLOSED | `true` para ativar o beta fechado |
| ADMIN_EMAILS | emails admin separados por vírgula |
| STRIPE_SECRET_KEY | chave Stripe live/test |
| STRIPE_PRICE_PREMIUM | price ID do plano Premium |
| STRIPE_PRICE_COUPLE | price ID do plano Casal |
| STRIPE_WEBHOOK_SECRET | segredo do webhook Stripe |
| STORAGE_ENDPOINT | endpoint S3/R2/B2 |
| STORAGE_ACCESS_KEY | access key do storage |
| STORAGE_SECRET_KEY | secret key do storage |
| STORAGE_BUCKET | nome do bucket |
| STORAGE_PUBLIC_URL | URL pública do bucket |
| CLIENT_URL | URL do frontend |
