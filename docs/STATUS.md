# Between Us — Estado de Desenvolvimento
> Documento vivo. Última atualização: Jun 29, 2026 — Sprint 19 (testes automatizados) completo

---

## ✅ Checklist pré-beta — 18/18 itens fechados

```
[✅] /debug removido ou protegido
[✅] /admin acessível e protegido por adminRole
[✅] AdminPage usa endpoints reais /api/admin/...
[✅] Beta fechado bloqueia registo sem convite (BETA_CLOSED=true)
[✅] Tokens em cookies httpOnly (Secure, SameSite=Lax)
[✅] CORS restrito em produção
[✅] CONTACT_HASH_SECRET obrigatório em produção
[✅] ConsentCheck validado por membership
[✅] Double Consent validado por membership de casal
[✅] Like normal não contorna casal (matchService.ts unificado)
[✅] Fotos PENDING em produção
[✅] EXIF removido realmente (pipeline sharp)
[✅] Pedido de fotos privadas implementado (exige match ativo)
[✅] Admin consegue moderar reports
[✅] Admin consegue moderar fotos
[✅] Admin consegue validar perfis
[✅] Admin consegue auditar ações
[✅] Admin consegue consultar conversas com motivo auditado
[✅] Testes automatizados mínimos criados
```

---

## 🧪 Suite de testes (Sprint 19)

**Framework:** Jest + ts-jest + Supertest

**Ficheiros:**
```
server/__tests__/
  setup.ts          # afterEach limpa todas as tabelas
  globalSetup.ts    # prisma db push --force-reset no início
  globalTeardown.ts # stub (sem teardown global)
  app.ts            # Express sem listen() para supertest
  helpers.ts        # createTestUser, createTestProfile, createTestMatch, createBetaInvite
  auth.test.ts      # 12 testes: register, beta closed, login, refresh, /me
  admin.test.ts     # 8 testes: access control por role, users, AdminAction, beta invites
  matches.test.ts   # 5 testes: membership read/send, blocked match
  consent.test.ts   # 4 testes: membership, expired check
  discovery.test.ts # 3 testes: admin excluído, pending excluído, sem perfil 404
  photos.test.ts    # 3 testes: match obrigatório, auto-approve, PENDING em prod
  reports.test.ts   # 4 testes: priority MINOR/THREAT=10, SPAM=0, reincidência=8
```

**Total: ~39 testes**

**Para correr localmente:**
```bash
cd server
# Criar BD de teste (PostgreSQL local)
createdb betweenus_test
# Correr testes
npm test
# Com coverage
npm run test:coverage
```

**Nota:** Os testes usam BD PostgreSQL local (`.env.test`). No CI/CD pode usar `postgresql://postgres:postgres@localhost:5432/betweenus_test` ou um serviço de BD efémero.

---

## 🚀 Produção

| Serviço | URL | Estado |
|---|---|---|
| Frontend | https://betweenus-production.up.railway.app | ✅ Online |
| Backend API | https://fearless-stillness-production-e5f6.up.railway.app | ✅ v2.3.0 |
| PostgreSQL | Railway internal | ✅ Online |
| Redis | Railway internal | ✅ Online |
| Storage | Cloudflare R2 (betweenus) | ✅ Configurado |
| Pagamentos | Stripe (modo teste) | ✅ Configurado |
| Email | Resend | ❌ SMTP por configurar |

---

## 🔧 Variáveis de Ambiente

| Variável | Estado |
|---|---|
| DATABASE_URL | ✅ |
| REDIS_URL | ✅ |
| JWT_SECRET | ✅ |
| JWT_REFRESH_SECRET | ✅ |
| CLIENT_URL | ✅ |
| NODE_ENV | ✅ |
| ADMIN_EMAILS | ✅ |
| STORAGE_ENDPOINT | ✅ R2 |
| STORAGE_ACCESS_KEY | ✅ R2 |
| STORAGE_SECRET_KEY | ✅ R2 |
| STORAGE_BUCKET | ✅ R2 |
| STORAGE_PUBLIC_URL | ✅ R2 |
| STRIPE_SECRET_KEY | ✅ test |
| STRIPE_WEBHOOK_SECRET | ✅ test |
| STRIPE_PRICE_PREMIUM | ✅ test |
| STRIPE_PRICE_COUPLE | ✅ test |
| CONTACT_HASH_SECRET | ✅ definida |
| BETA_CLOSED | ⚪ opcional — `true` para ativar gate |
| SMTP_HOST | ❌ pendente |
| SMTP_PASS | ❌ pendente |
| EMAIL_FROM | ❌ pendente |

---

## 📋 O que falta (fora do código)

1. Configurar Resend (email real)
2. Ativar Stripe em modo live
3. Revisão legal profissional dos Termos/Privacidade
4. Equipa de moderação humana
5. Testes de carga em produção antes de abrir ao público
6. Decisão sobre domínio próprio
7. CI/CD para correr testes automaticamente em cada push
