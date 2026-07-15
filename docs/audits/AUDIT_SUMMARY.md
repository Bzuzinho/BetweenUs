# Resumo da Auditoria — Between Us
> Data: Julho 2026 | 15 tarefas executadas

> ⚠️ **Ver também:** [`CLOSED_BETA_SECURITY_AUDIT_2026-07-14.md`](./CLOSED_BETA_SECURITY_AUDIT_2026-07-14.md)
> — auditoria mais recente (14 jul 2026), focada em preparação para Closed Beta.
> Corrige RP-1 (isolamento de conversas Socket.IO — não coberto por nenhuma auditoria
> anterior), RP-3/RM-01 (fotos privadas — mecanismo principal já estava correto, gap real
> era fotos legadas + bypass numa Private Room), RP-4/RM-04 (rate limiting), RP-5/RM-04
> (ts-node → build compilado). Ver esse documento para o estado atual — vários riscos
> listados abaixo como "pendente" já foram corrigidos.
>
> ⚠️ **Ver também:** [`BETA_SEED_VALIDATE_FAILURES_2026-07-15.md`](./BETA_SEED_VALIDATE_FAILURES_2026-07-15.md)
> — análise das 22 falhas de `npm run db:seed:beta:validate` (15 jul 2026). Zero bugs de
> produção; causa raiz é catálogo estrutural desatualizado no ambiente alvo (`npm run
> db:seed` precisa de re-correr) + duas correções no próprio seed/validador de teste
> (Report órfão em `phases/safety.ts`, check de SafetyCheckin sensível a tempo em
> `validate.ts`).

---

## Ficheiros analisados

**Backend:**
server/src/routes/auth.ts, profiles.ts, discovery.ts, matches.ts, privacy.ts,
reports.ts, admin.ts, subscriptions.ts, couples.ts, photos.ts, contacts.ts,
verifications.ts, travel.ts, consent.ts, safety.ts, beta.ts
server/src/middleware/auth.ts, admin.ts
server/src/lib/matchService.ts, imageProcessing.ts, riskScore.ts, storage.ts
server/prisma/schema.prisma
server/package.json

**Testes:**
server/__tests__/auth.test.ts, admin.test.ts, matches.test.ts, consent.test.ts,
discovery.test.ts, photos.test.ts, reports.test.ts

---

## Ficheiros criados

**Documentos legais:**
- docs/legal/TERMS_OF_SERVICE.md
- docs/legal/PRIVACY_POLICY.md
- docs/legal/COMMUNITY_GUIDELINES.md
- docs/legal/CONSENT_POLICY.md
- docs/legal/DATA_RETENTION_POLICY.md
- docs/legal/SAFETY_AND_REPORTING_POLICY.md
- docs/legal/PAYMENTS_AND_REFUNDS_POLICY.md
- docs/legal/PRE_LAUNCH_COMPLIANCE_CHECKLIST.md
- docs/legal/GDPR_DPIA_CHECKLIST.md
- docs/legal/SUBPROCESSORS_REGISTER.md
- docs/legal/INCIDENT_RESPONSE_PLAN.md

**Documentos de produto/auditoria:**
- docs/audits/CURRENT_STATE_AUDIT.md
- docs/audits/SECURITY_AUDIT.md
- docs/audits/AUDIT_SUMMARY.md (este ficheiro)
- docs/product/MVP_STATUS.md
- docs/product/PAYMENT_RISK_REVIEW.md
- docs/product/MODERATION_WORKFLOW.md
- docs/product/LOCATION_PRIVACY_REVIEW.md
- docs/product/GDPR_USER_RIGHTS_WORKFLOW.md

---

## Ficheiros alterados

| Ficheiro | Tarefa | Alteração |
|---|---|---|
| server/src/routes/auth.ts | T4, T5, T13 | Consentimento granular (7 campos + IP/userAgent), emailVerifiedAt não automático em prod, DELETE /account + GET /export |
| server/src/routes/subscriptions.ts | T6 | Stripe production guard — bloqueia upgrade directo em produção |
| server/src/routes/reports.ts | T7 | ReportReason expandido (COERCION, REVENGE_PORN, DOXXING, PROSTITUTION_OR_ESCORT, PAID_SEXUAL_SERVICES, SCAM) + prioridades correctas |
| server/src/routes/photos.ts | T9 | Delete apaga storagePath E blurredPath |
| server/src/routes/contacts.ts | T10 | CONTACT_HASH_SECRET sem fallback em produção |
| server/prisma/schema.prisma | T4, T7 | ipAddress + userAgent em UserConsent; novos ReportReason values |
| server/__tests__/auth.test.ts | T14 | Testes expandidos: consentimento granular, menores, RGPD, banned/suspended |

---

## Riscos críticos encontrados

| ID | Risco | Estado |
|---|---|---|
| RC-1 | emailVerifiedAt definido automaticamente em produção | ✅ Corrigido |
| RC-2 | CONTACT_HASH_SECRET com fallback hardcoded | ✅ Corrigido |
| RC-3 | Upgrade Premium sem Stripe em produção | ✅ Corrigido |
| RC-4 | Sem endpoint de eliminação de conta (RGPD) | ✅ Corrigido |

---

## Riscos altos encontrados

| ID | Risco | Estado |
|---|---|---|
| RA-1 | Delete de foto não apagava blurredPath | ✅ Corrigido |
| RA-2 | Mensagens com expiresAt não apagadas | 🔲 Pendente (job/cron) |
| RA-3 | ReportReason sem categorias críticas | ✅ Corrigido |
| RA-4 | Consentimento não granular | ✅ Corrigido |
| RA-5 | Sem exportação de dados (RGPD) | ✅ Corrigido |

---

## Riscos pendentes (não corrigidos nesta sessão)

| ID | Risco | Prioridade | Acção necessária |
|---|---|---|---|
| RP-1 | Coordenadas de localização exactas na BD | MÉDIA | Coarsen antes de guardar (1 casa decimal) |
| RP-2 | Mensagens expiresAt sem job de limpeza | MÉDIA | Cron job ou worker |
| RP-3 | URLs de fotos privadas permanentes | MÉDIA | Signed URLs no R2 ou proxy |
| RP-4 | Sem rate limiting em upload de fotos | BAIXA | Adicionar rateLimit ao router |
| RP-5 | ts-node em produção | BAIXA | Build compilada com tsc |
| RP-6 | Email verification real não implementada | ALTA | Configurar Resend + enviar link de verificação |
| RP-7 | Revogar consentimentos individuais | MÉDIA | Endpoint PUT /api/auth/consents/:type/revoke |
| RP-8 | Revisão legal de todos os documentos | BLOCKER | Advogado antes do lançamento |

---

## Próximos 10 passos recomendados antes de beta público

1. **Configurar Resend** e implementar email de verificação real (RP-6 + RC-1 já corrigido em código, falta o envio)
2. **Coarsen coordenadas** de localização antes de guardar no perfil (RP-1) — 3 linhas de código
3. **Rate limit em upload de fotos** (RP-4) — 1 linha
4. **Revisão legal** de todos os documentos em /docs/legal/ por advogado (RP-8)
5. **Equipa de moderação** — recrutar e treinar pelo menos 1 pessoa para revisar reports críticos
6. **Testar fluxo completo** de beta: admin cria convite → utilizador regista → perfil aprovado → match → chat → safe exit
7. **Domínio próprio** (não railway.app) e email profissional antes de lançar
8. **Job de limpeza** para accounts DELETED há mais de 30 dias e mensagens expiradas (RP-2)
9. **Checklist Stripe** — entidade legal, verificação de negócio, MCC, antes de activar pagamentos live
10. **Pen test externo** ou auditoria de segurança por terceiro antes de escalar utilizadores

---

⚠️ Todos os documentos em /docs/legal/ são templates internos e requerem revisão jurídica profissional antes do lançamento público.
