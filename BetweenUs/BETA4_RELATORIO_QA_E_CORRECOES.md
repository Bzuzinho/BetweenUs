# Between Us — Relatório de QA (BETA.4) e Correções Aplicadas

**Ambiente:** betweenus-production.up.railway.app
**Data do relatório:** 14 jul 2026
**Branch das correções:** `beta-4-typecheck-fix`
**Método:** API direta (contas seed) + browser para pontos visuais. Pagamentos só visualização, sem checkout nem cancelamentos reais.

## Resultado geral do relatório

| Passos ✅ | Observações ⚠️ | Falhas ❌ | Não testados ⏳ |
|---|---|---|---|
| 86 | 6 | 2 (bloqueantes) | 3 |

Cobertura: autenticação, perfis (individual/casal/grupo), discovery/matching, chat, privacidade, verificação, admin (6 roles), afiliados e pagamentos.

---

## 🔴 Achados críticos — corrigidos

### 1. `PUT /api/admin/users/:id/status` devolvia o `passwordHash`
Suspender/reativar um utilizador (ação de moderação mais comum) devolvia o objeto `User` do Prisma sem `select`, incluindo o hash bcrypt da password em claro. Qualquer role com permissão `users` (SUPER_ADMIN, ADMIN, SUPPORT) conseguia extrair o hash de qualquer conta com uma ação de rotina.

**Fix:** `select` explícito (`id, email, status, adminRole, accountName`), igual ao padrão já usado nas rotas irmãs.

### 2. `GET /api/admin/email-config` expunha segredos de SMTP/SendGrid
A rota usava `requireAdmin()` sem argumento de permissão — qualquer uma das 6 roles admin passava (incl. FINANCE, CONTENT_REVIEWER), expondo host SMTP, remetente e prefixos de `SMTP_PASS`/`SENDGRID_API_KEY`.

**Fix:** `requireAdmin('configuracoes')` — mesma permissão de `PUT /referral-rule`, hoje só o SUPER_ADMIN tem.

**Commit:** `f7a2824` — *"fix(admin): não expor passwordHash em PUT /users/:id/status; restringir GET /email-config a SUPER_ADMIN"*
**Ficheiro:** `server/src/routes/admin.ts`

---

## ⚠️ Achado sistémico — corrigido

### `CLIENT_URL` com barra dupla em todos os links gerados
A env var `CLIENT_URL` em produção (Railway) tinha `/` a mais no fim, produzindo barra dupla em convites de casal/grupo, referrals, verify-email, reset-password, otp-login e success/cancel do Stripe checkout. Também afetava `ALLOWED_ORIGINS` do CORS (Socket.io e Express) em `index.ts` — só não partia porque existe um domínio de produção hardcoded duplicado como rede de segurança.

**Fix:** cada declaração `const CLIENT_URL = process.env.CLIENT_URL || '...'` passou a normalizar com `.replace(/\/+$/, '')`, tornando o comportamento correto independentemente do valor da env var no Railway.

**Commit:** `e5ccf55` — *"fix(client-url): normalizar barra final de CLIENT_URL em todos os sítios"*
**Ficheiros:** `index.ts`, `utils/email.ts`, `lib/email.ts`, `routes/admin.ts`, `routes/auth.ts`, `routes/couples.ts`, `routes/groups.ts`, `routes/referrals.ts`, `routes/subscriptions.ts` (9 ficheiros)

---

## Achados não-bloqueantes — corrigidos

### Auto-perfil no próprio Discovery
Com o perfil ativo em Casal, o perfil Individual do próprio utilizador aparecia na grelha do seu Discovery (e vice-versa) — permitia dar like/pass/block em si próprio. `excludeIds` só excluía o perfil ATIVO, não todos os perfis do mesmo utilizador.

**Fix:** nova função `getProfileIdsForUsers()` em `profileMembershipService.ts` resolve todos os perfis (Individual/Casal/Grupo) de um conjunto de utilizadores; `excludeIds` no Discovery passou a incluir todos.

### Copy "suspensa" em vez de "banida"
Mensagem de login para conta BANNED dizia "Esta conta foi suspensa." (copy-paste do texto de SUSPENDED). Cosmético — o `code: ACCOUNT_BANNED` já estava correto, sem impacto funcional.

**Fix:** texto corrigido para "Esta conta foi banida."

### RGPD — impossível revogar consentimentos opcionais
Não existia endpoint para revogar MARKETING/LOCATION/CONTACT_HASHING — só `POST /consents/reaccept`, que cria um novo registo de aceitação, nunca revoga. `UserConsent.revokedAt` já existia no schema mas nada escrevia nele.

**Fix:** novo `POST /api/auth/consents/revoke`. TERMS/PRIVACY_POLICY/SENSITIVE_DATA continuam não-revogáveis por este canal (são obrigatórios para usar a app).

> Nota: não incluí purga retroativa de hashes de contacto já guardados quando alguém revoga CONTACT_HASHING — é uma decisão de produto (apagar dados vs. só parar de processar novos), não uma correção óbvia de bug.

**Commit:** `c77c93a` — *"fix: achados não-bloqueantes do QA (auto-perfil no Discovery, copy BANNED, revogação de consentimentos)"*
**Ficheiros:** `discoveryService.ts`, `profileMembershipService.ts`, `auth.ts`, `legalDocumentService.ts`

---

## Pendente — não é código

| Item | Ação necessária |
|---|---|
| Modo Stripe (live vs. teste) | Confirmar `STRIPE_SECRET_KEY` no Railway (`sk_live_` vs `sk_test_`) — não verificável sem inspecionar a env var diretamente |
| `SENTRY_DSN` não configurado | Sem monitorização de erros em produção — flag informativa, não bloqueante |

---

## Achados do relatório sem ação necessária (confirmados OK)

Registo e consentimento (7/7), perfis individual/casal/grupo (5/5), discovery e matching incl. active profile context (12/12), chat/private rooms/check-in (4/4 + check-in), privacidade (3/3), admin RBAC nas 6 roles, afiliados/referrals (4/4), fotos por camadas, notificações, travel mode, verificação de identidade, health checks sem segredos expostos, regressões históricas (ActionType, db:seed, diagnóstico de email).

---

## Resumo dos commits

| Commit | Descrição | Estado |
|---|---|---|
| `f7a2824` | Fixes críticos (passwordHash, email-config) | ✅ no GitHub |
| `e5ccf55` | Normalização CLIENT_URL (9 ficheiros) | ✅ no GitHub |
| `c77c93a` | Não-bloqueantes (Discovery, copy, RGPD revoke) | ⏳ commitado localmente — falta `git push origin beta-4-typecheck-fix` |
