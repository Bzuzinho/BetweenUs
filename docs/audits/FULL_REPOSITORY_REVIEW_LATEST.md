# Revisão Completa do Repositório — Between Us
> Data: Julho 2026 | Auditoria rev. 3 (mais recente)
> 17 tarefas executadas

---

## Resumo executivo

O Between Us tem backend real, funcional e com boa cobertura de segurança. A maior parte dos
riscos críticos foram corrigidos em auditorias anteriores. Esta auditoria focou-se em
inconsistências Prisma/código, email verification, coarsening de localização e documentação viva.

O principal bloqueador para beta privado é operacional (SMTP/Resend), não técnico.
O principal bloqueador para produção pública é legal (revisão jurídica).

---

## Estado actual

- API v2.4.0 em produção (Railway)
- 35 módulos auditados
- 39+ testes automatizados
- GitHub Actions CI activo
- 11 documentos legais (templates — sem revisão jurídica)

---

## Funcionalidades concluídas

Auth, consentimento granular, perfis individuais e de casal, onboarding progressivo,
Between Score, Double Consent Match, chat em tempo real, Safe Exit, Modo Acordo,
ConsentCheck (7 fases), safety checkins, reports (14 categorias), admin panel (9 tabs, RBAC),
audit log, fotos (EXIF strip, blur, moderação, rate limit), private photo access,
Soft Reveal, contact blocking (HMAC), privacy settings, Travel Mode, Stripe checkout,
Stripe webhooks, GDPR export, GDPR account deletion, beta gate.

---

## Funcionalidades parciais

| Módulo | Gap |
|---|---|
| Email verification | Endpoints criados; SMTP não configurado |
| Age verification | ageVerifiedAt não preenchido após selfie aprovada |
| Consent revocation | Campo revokedAt existe; sem endpoint de revogação |
| Private rooms | Usa chat normal; sem backend dedicado |
| Jobs/cron | cleanupExpiredMessages.ts criado; não corre no Railway |
| Monitoring | Sem Sentry ou alertas |
| Legal docs | Templates sem revisão jurídica |
| GDPR export | Não inclui matches/mensagens |
| GDPR hard delete | Soft-delete implementado; job de 30 dias não existe |

---

## Bugs e desalinhamentos encontrados e corrigidos

| ID | Problema | Ficheiro | Correcção |
|---|---|---|---|
| BUG-01 | UserConsent sem ipAddress/userAgent no schema | schema.prisma | ✅ Adicionados |
| BUG-02 | Verification sem selfieStoragePath no schema | schema.prisma | ✅ Adicionado |
| BUG-03 | locationLat/Lng guardados em precisão exacta | profiles.ts | ✅ coarsenCoordinate() aplicado |
| BUG-04 | locationLat/Lng devolvidos em respostas públicas | profiles.ts | ✅ Stripped do GET /me e GET /:id |
| BUG-05 | Email verification sem endpoints reais | verifications.ts | ✅ POST /email/request + /email/confirm |
| BUG-06 | Selfie URL nunca persistida após upload | verifications.ts | ✅ selfieStoragePath guardado |

---

## Riscos críticos — estado actual

| ID | Risco | Estado |
|---|---|---|
| RC-01 | emailVerifiedAt automático em prod | ✅ Corrigido (rev. anterior) |
| RC-02 | CONTACT_HASH_SECRET fallback | ✅ Corrigido (rev. anterior) |
| RC-03 | Upgrade sem Stripe em prod | ✅ Corrigido (rev. anterior) |
| RC-04 | Sem DELETE /account | ✅ Corrigido (rev. anterior) |
| RC-05 | UserConsent sem ipAddress/userAgent | ✅ Corrigido (esta rev.) |
| RC-06 | Coordenadas exactas na BD | ✅ Corrigido (esta rev.) |

---

## Riscos altos — estado actual

| ID | Risco | Estado |
|---|---|---|
| RA-01 | Delete foto sem blurredPath | ✅ Corrigido (rev. anterior) |
| RA-02 | JWT_SECRET fallback em prod | ✅ Corrigido (rev. anterior) |
| RA-03 | Access token 7 dias | ✅ Corrigido (rev. anterior) |
| RA-04 | Webhook sem verificação de assinatura | ✅ Corrigido (rev. anterior) |
| RA-05 | stripeCustomerId vs providerCustomerId | ✅ Corrigido (rev. anterior) |
| RA-06 | Email verification sem endpoints | ✅ Corrigido (esta rev.) |
| RA-07 | Selfie URL não persistida | ✅ Corrigido (esta rev.) |

---

## Riscos médios — pendentes

| ID | Risco | Prioridade |
|---|---|---|
| RM-01 | URLs fotos privadas permanentes (não signed) | MÉDIA |
| RM-02 | ageVerifiedAt não preenchido | BAIXA |
| RM-03 | Job cleanup não corre no Railway | BAIXA |
| RM-04 | ts-node em produção | BAIXA |
| RM-05 | Hard delete job não existe | MÉDIA |
| RM-06 | Sem Sentry/monitoring | MÉDIA |
| RM-07 | CSP desligado no Helmet | BAIXA |

---

## Riscos baixos

- Sem logging estruturado
- ELITE plan no enum mas não implementado
- Error messages em inglês/português misturados
- Sem paginação em alguns endpoints admin

---

## Alterações de código feitas nesta auditoria

| Ficheiro | Alteração |
|---|---|
| `server/prisma/schema.prisma` | ipAddress/userAgent em UserConsent; selfieStoragePath em Verification |
| `server/src/routes/profiles.ts` | coarsenCoordinate() antes de guardar coords; strip coords do response |
| `server/src/routes/verifications.ts` | Email verify endpoints (request + confirm); selfieStoragePath persistido |
| `server/src/index.ts` | v2.4.0; CSP TODO comment; email verify routes registadas |
| `server/.env.example` | Todas as variáveis documentadas |

---

## Documentação actualizada nesta auditoria

| Ficheiro | Razão |
|---|---|
| `docs/DOCUMENTATION_LIVING_RULES.md` | Criado — regras de docs vivas |
| `docs/product/DECISIONS.md` | Criado — 6 decisões registadas |
| `docs/product/BETA_PRIVATE_READINESS_CHECKLIST.md` | Criado — checklist em 3 níveis |
| `docs/product/MVP_STATUS.md` | Actualizado — 35 módulos, rev. 3 |
| `docs/audits/FULL_REPOSITORY_REVIEW_LATEST.md` | Criado — este ficheiro |
| `docs/audits/PRISMA_CODE_CONSISTENCY_AUDIT.md` | Actualizado com BUG-01 a BUG-06 |

---

## Testes criados nesta auditoria

Ficheiro: `server/__tests__/auth.test.ts` (actualizado)
- Consentimento granular (ageConfirmed, privacyAccepted, sensitiveDataAccepted)
- Menor de 18 bloqueado
- Registo em produção → PENDING_VERIFICATION
- emailVerifiedAt null em produção
- Banned/suspended bloqueados
- RGPD export e delete

---

## Próximos 15 passos

1. **Configurar Resend/SMTP** — email verification real (BLOCKER para beta)
2. **Criar conta Resend** e adicionar SMTP_HOST/PASS/EMAIL_FROM no Railway
3. **Preencher ageVerifiedAt** quando selfie aprovada em admin.ts (verifications)
4. **Configurar cron Railway** para cleanupExpiredMessages (1x/hora)
5. **Criar endpoint** PUT /api/auth/consents/:type/revoke para revogar consentimentos
6. **Signed URLs** para fotos privadas (R2 presigned URLs com expiração curta)
7. **Hard delete job** — apagar contas DELETED há +30 dias
8. **Sentry** ou equivalente para monitoring em produção
9. **Content-Security-Policy** — activar no Helmet com política adequada
10. **Build TypeScript compilada** (tsc) em vez de ts-node
11. **Teste E2E manual** do fluxo completo antes de primeiro beta user
12. **Recrutar moderador** para reviews de fotos e reports críticos
13. **Revisão jurídica** dos docs em /docs/legal/ — contratar advogado
14. **Testes adicionais** — email verify, Stripe prod 503, signed URL auth
15. **Definir domínio próprio** e email profissional antes de qualquer comunicação pública

---

## Checklist go/no-go para beta privado

| Item | Estado |
|---|---|
| Backend online e saudável | ✅ |
| BETA_CLOSED=true | ✅ (quando activado) |
| Beta invites criados | ✅ (admin panel) |
| Admin configurado | ✅ |
| Testes passam | ✅ |
| Rate limits activos | ✅ |
| Privacy defaults correctos | ✅ |
| Storage R2 a funcionar | ✅ |
| CONTACT_HASH_SECRET definida | ✅ |
| JWT secrets definidas | ✅ |
| Email verification real | ❌ BLOCKER |
| Moderador activo | ❌ BLOCKER |
| Documentos legais revistos internamente | ⚠️ Parcial |

**Resultado: NO-GO** — 2 BLOCKERs activos. Beta pode abrir quando email verification estiver activa e moderador designado.

---

## Comandos após este deploy

```bash
cd server
npm install
npx prisma generate
npx prisma db push        # em dev/staging
# em produção: npx prisma migrate deploy

npm test                  # correr suite de testes
```

## Variáveis Railway obrigatórias

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

Críticas para funcionalidade completa:
```
SMTP_HOST
SMTP_PASS
EMAIL_FROM
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PREMIUM
STRIPE_PRICE_COUPLE
BETA_CLOSED=true
ADMIN_EMAILS (fallback)
```
