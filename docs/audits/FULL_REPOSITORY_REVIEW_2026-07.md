# Revisão Completa do Repositório — Between Us
> Data: Julho 2026 | 15 tarefas executadas

---

## Resumo executivo

O Between Us tem um backend real, funcional e com segurança razoável. O produto está mais próximo de beta privado do que de protótipo. Foram identificadas e corrigidas 5 inconsistências críticas entre o schema Prisma e o código TypeScript. Os riscos legais são o principal bloqueador antes de qualquer lançamento público.

---

## Funcionalidades implementadas e funcionais

- Autenticação completa (registo, login, refresh, logout, cookies httpOnly)
- Consentimento granular no registo (5 obrigatórios + 3 opcionais, com IP e userAgent)
- Perfis individuais e de casal com onboarding progressivo
- Between Score (compatibilidade por intenções, limites, localização)
- Double Consent Match para casais
- Soft Reveal (4 níveis de visibilidade de fotos)
- Pipeline de imagens real (EXIF strip, resize, blur)
- Moderação de fotos em produção (PENDING até aprovação)
- Pedidos de acesso a fotos privadas (PhotoAccessRequest)
- Chat em tempo real (Socket.io) com Safe Exit e Modo Acordo
- ConsentCheck por fase (7 fases)
- Safety checkins
- Reports com 14 categorias e prioridade automática
- Admin panel com 9 tabs, RBAC e audit log
- Risk score automático
- Beta gate (BETA_CLOSED)
- RGPD: eliminação de conta + exportação de dados
- Contact blocking (HMAC-SHA256)
- Travel Mode
- Privacy settings (invisível, distância, notificações)
- Testes automatizados (39+) com GitHub Actions CI

---

## Funcionalidades parciais

- Email verification — código implementado, falta SMTP (Resend)
- Mensagens temporárias — campo expiresAt existe, falta cron job
- Hard delete de contas — soft-delete implementado, job de 30 dias não existe
- Exportação RGPD — não inclui matches/mensagens
- Localização — sem coarsening antes de guardar coordenadas

---

## Problemas críticos encontrados e corrigidos

| ID | Problema | Correcção |
|---|---|---|
| PC-01 | `subscriptions.ts` usava `stripeCustomerId` (campo não existe no schema) | ✅ Corrigido para `providerCustomerId` |
| PC-02 | `subscriptions.ts` usava `stripeSubscriptionId` (campo não existe no schema) | ✅ Corrigido para `providerSubscriptionId` |
| PC-03 | `jwt.ts`: JWT_SECRET com fallback hardcoded em produção | ✅ Lança Error em produção |
| PC-04 | `jwt.ts`: access token expirava em 7 dias | ✅ Corrigido para 15 minutos |
| PC-05 | `webhooks.ts`: STRIPE_WEBHOOK_SECRET nullable sem guard em produção | ✅ Recusa eventos em produção sem secret |

---

## Problemas altos

| ID | Problema | Estado |
|---|---|---|
| PA-01 | Email verification não activa em produção (falta SMTP) | 🔲 Pendente — configurar Resend |
| PA-02 | Coordenadas de localização exactas na BD | 🔲 Pendente — aplicar coarsenCoordinate |
| PA-03 | URLs de fotos privadas são permanentes (R2 público) | 🔲 Pendente — signed URLs |
| PA-04 | ts-node em produção (não compilado) | 🔲 Pendente — considerar tsc |
| PA-05 | Hard delete de contas (job 30 dias) não implementado | 🔲 Pendente |

---

## Problemas médios

| ID | Problema | Estado |
|---|---|---|
| PM-01 | Job de limpeza de mensagens expiradas não existe | ✅ Script criado, falta configurar cron Railway |
| PM-02 | CONTACT_HASHING consent não verificado antes de bloquear contactos | ✅ Corrigido |
| PM-03 | Rate limit em upload de fotos não existia | ✅ Corrigido (10/15min) |
| PM-04 | ageVerifiedAt nunca preenchido após aprovação de selfie | 🔲 Pendente |
| PM-05 | ADMIN_EMAILS como mecanismo principal de admin (sem adminRole) | ⚠️ Fallback mantido mas documentado |

---

## Problemas baixos

- contentSecurityPolicy desligado no Helmet
- Sem logging estruturado (apenas console.error)
- Sem monitorização de uptime (Sentry ou equivalente)
- Alguns error messages em inglês (mistura PT/EN)
- ELITE em SubscriptionPlan não implementado

---

## Riscos legais

| Risco | Severidade | Acção |
|---|---|---|
| Documentos legais sem revisão jurídica | CRÍTICO | Advogado antes de qualquer lançamento |
| Stripe live sem validação legal dos planos | CRÍTICO | Revisão legal antes de activar |
| DPIA não completa formalmente | ALTO | Completar antes de lançamento público |
| CNPD não notificada (se aplicável) | MÉDIO | Verificar com advogado |

---

## Riscos de segurança (após correcções desta sessão)

| Risco | Estado |
|---|---|
| JWT_SECRET hardcoded | ✅ Corrigido |
| stripeCustomerId campo inexistente | ✅ Corrigido |
| Webhook sem verificação de assinatura | ✅ Corrigido |
| CONTACT_HASH_SECRET fallback | ✅ Corrigido |
| URLs de fotos privadas permanentes | 🔲 Pendente |
| ts-node em produção | 🔲 Pendente |

---

## Riscos de produto

- Sem email verification activa, utilizadores ficam bloqueados em PENDING_VERIFICATION
- Sem equipa de moderação, reports críticos ficam sem resposta
- Sem domínio próprio, credibilidade reduzida para beta

---

## Ficheiros alterados nesta auditoria

| Ficheiro | Alteração |
|---|---|
| `server/src/routes/subscriptions.ts` | providerCustomerId/providerSubscriptionId; Stripe guard; prod 503 |
| `server/src/routes/webhooks.ts` | STRIPE_WEBHOOK_SECRET obrigatório em prod; providerCustomerId consistente |
| `server/src/utils/jwt.ts` | JWT_SECRET obrigatório em prod; access token 15min |
| `server/src/routes/contacts.ts` | Verificação de consentimento CONTACT_HASHING antes de bloquear |
| `server/src/routes/photos.ts` | Rate limit (10/15min); delete blurredPath |
| `README.md` | Completamente reescrito com estado real |

## Ficheiros criados

| Ficheiro | Conteúdo |
|---|---|
| `server/src/utils/location.ts` | coarsenCoordinate, formatApproxDistance, haversineKm |
| `server/src/jobs/cleanupExpiredMessages.ts` | Job de soft-delete para mensagens expiradas |
| `docs/audits/PRISMA_CODE_CONSISTENCY_AUDIT.md` | Todas as inconsistências schema↔código |
| `docs/product/PRODUCTION_READINESS_CHECKLIST.md` | Variáveis obrigatórias + checklist |
| `docs/product/TRUST_AND_SAFETY_RUNBOOK.md` | Runbook operacional de moderação |
| `docs/product/MESSAGE_RETENTION_REVIEW.md` | Retenção, job, acesso admin |
| `docs/product/MVP_STATUS.md` | Estado por módulo (actualizado) |
| `docs/audits/FULL_REPOSITORY_REVIEW_2026-07.md` | Este ficheiro |

## Testes adicionados

- `auth.test.ts`: consentimento granular, menores, banned/suspended, PENDING_VERIFICATION, RGPD export/delete
- Testes de subscriptions/webhooks ainda por adicionar (T11 parcial)

---

## Próximos 15 passos antes de beta público

1. **Configurar Resend** — SMTP para email verification real (BLOCKER)
2. **Revisão jurídica** — advogado revê todos os docs em /docs/legal/ (BLOCKER)
3. **Recrutar moderador** — pelo menos 1 pessoa para reports críticos (BLOCKER)
4. **Aplicar `coarsenCoordinate`** em profiles.ts antes de guardar locationLat/Lng
5. **Configurar cron job no Railway** para `cleanupExpiredMessages.ts`
6. **Testar fluxo completo de Stripe** após correcção do providerCustomerId
7. **Domínio próprio** — betweenus.app em vez de railway.app
8. **Job de hard delete** — apagar contas DELETED há mais de 30 dias
9. **Filled `ageVerifiedAt`** quando selfie é aprovada em admin.ts
10. **Signed URLs** para fotos privadas no R2 (ou proxy autenticado)
11. **Testes de subscriptions/webhooks** — adicionar suite T11
12. **Teste E2E manual** do fluxo completo: convite beta → registo → perfil → match → chat → safe exit
13. **Pen test externo** ou revisão de segurança por terceiro
14. **Sentry ou equivalente** para monitorização de erros em produção
15. **Decidir entre ts-node vs build compilada** para produção (performance + segurança)

---

## Comandos para correr após este deploy

```bash
# Na máquina local com o repositório clonado
cd server
npm install
npx prisma generate
npx prisma db push          # em dev/staging
# ou em produção:
# npx prisma migrate deploy

npm test                    # correr suite de testes
```

## Variáveis Railway obrigatórias para produção

```
DATABASE_URL
REDIS_URL
JWT_SECRET
JWT_REFRESH_SECRET
CLIENT_URL
NODE_ENV=production
CONTACT_HASH_SECRET
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET
STORAGE_PUBLIC_URL
```

Opcionais mas críticas para funcionalidade completa:
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PREMIUM
STRIPE_PRICE_COUPLE
SMTP_HOST
SMTP_PASS
EMAIL_FROM
BETA_CLOSED=true
ADMIN_EMAILS
```
