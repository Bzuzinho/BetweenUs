# Between Us — Estado Real do MVP
> Última actualização: Julho 2026 — pós-auditoria completa (rev. 3)
> ⚠️ Documento interno. Não publicar. Actualizar sempre que uma funcionalidade muda.

---

## Legenda
- **DONE** — implementado, testado, sem riscos conhecidos activos
- **PARTIAL** — existe mas com gaps conhecidos ou testes incompletos
- **RISKY** — existe mas com risco técnico, legal ou de segurança activo
- **BLOCKER** — em falta ou quebrado; impede beta público responsável
- **NOT_STARTED** — não implementado

---

| Módulo | Estado | Ficheiros | O que funciona | O que falta | Risco | Prioridade | Próximo passo |
|---|---|---|---|---|---|---|---|
| Auth | DONE | auth.ts, jwt.ts, middleware/auth.ts | Registo, login, refresh, logout, cookies httpOnly, rate limit | SMTP real para email verify | BAIXO | — | Configurar Resend |
| Email verification | PARTIAL | auth.ts, verifications.ts | Endpoints criados (request + confirm), token em Redis | SMTP não configurado — emails não são enviados | ALTO | CRÍTICA | Configurar Resend/SMTP |
| Age verification | PARTIAL | auth.ts, verifications.ts | Data de nascimento validada (≥18), selfie upload | ageVerifiedAt nunca preenchido após selfie aprovada | BAIXO | MÉDIA | Preencher ageVerifiedAt em admin.ts quando verifica selfie |
| Consentimento granular | DONE | auth.ts, schema.prisma | 5 obrigatórios + 3 opcionais; IP e userAgent guardados | Revogar consentimento individual sem endpoint dedicado | BAIXO | MÉDIA | Endpoint PUT /api/auth/consents/:type/revoke |
| User consents | DONE | schema.prisma, auth.ts | UserConsent com ipAddress, userAgent, version, revokedAt | — | BAIXO | — | — |
| Perfis individuais | DONE | profiles.ts | Criação, edição, onboarding 10 passos, coordenadas coarsened | — | BAIXO | — | — |
| Perfis de casal | DONE | couples.ts | Convite, join, Double Consent, separação | — | BAIXO | — | — |
| Discovery | DONE | discovery.ts, matchService.ts | Between Score, filtros, admin/pending/invisible excluídos, HMAC contact block | Coarsening coordenadas confirmado | BAIXO | — | — |
| Between Score | DONE | discovery.ts | Score ponderado, scoreExplanation, badges de verificação | Pesos não ajustados com dados reais | BAIXO | BAIXA | Ajustar pesos após beta |
| Matching | DONE | matchService.ts | Single source of truth, individual + couple, PENDING_COUPLE_APPROVAL | — | BAIXO | — | — |
| Double Consent Match | DONE | couples.ts, matchService.ts | Aprovação de ambos os parceiros, validação de membership | — | BAIXO | — | — |
| Chat | DONE | matches.ts, Socket.io | Mensagens em tempo real, membership validation, soft-delete | expiresAt sem cron job activo | BAIXO | BAIXA | Configurar cron Railway |
| Private rooms | PARTIAL | MatchesScreen.jsx | Acordo antes do chat, Safe Exit, regras fixadas | Sem backend dedicado (usa chat normal) | BAIXO | BAIXA | Fase 2 |
| Consent checks | DONE | consent.ts | 7 fases, membership validation, expiração | — | BAIXO | — | — |
| Safety checkins | DONE | safety.ts | Criação, confirmação, cancelamento | Sem alerta automático se não confirmado | BAIXO | BAIXA | Worker de alertas |
| Reports | DONE | reports.ts, schema.prisma | 14 categorias, prioridade automática, reincidência | — | BAIXO | — | — |
| Admin panel | DONE | admin.ts, admin middleware | 9 tabs, RBAC 6 roles, audit log, risk score, conversas com motivo | Listagem de subscrições em falta no admin | BAIXO | BAIXA | Adicionar tab |
| Audit log | DONE | admin middleware, admin.ts | AdminAction com IP, userAgent, reason, previousData, newData | — | BAIXO | — | — |
| Photos | DONE | photos.ts, imageProcessing.ts | Upload, EXIF strip, blur, moderação em prod, rate limit (10/15min) | URLs permanentes públicas | MÉDIO | MÉDIA | Signed URLs |
| Private photo access | DONE | photos.ts | PhotoAccessRequest, aprovação, revogação, match obrigatório | — | BAIXO | — | — |
| Soft Reveal | DONE | photos.ts, schema.prisma | 4 níveis (PUBLIC/BLURRED/PRIVATE_AFTER_MATCH/PRIVATE_AFTER_APPROVAL) | — | BAIXO | — | — |
| Contact blocking | DONE | contacts.ts | HMAC-SHA256, sem fallback em prod, limite 500, requer consentimento CONTACT_HASHING | — | BAIXO | — | — |
| Privacy settings | DONE | privacy.ts | Invisível (Premium), distância, notificações, allowPhotoRequests | — | BAIXO | — | — |
| Travel mode | DONE | travel.ts | Activar, desactivar, múltiplos destinos | Sem expiração automática | BAIXO | BAIXA | Job de expiração |
| Subscriptions | DONE | subscriptions.ts | Stripe checkout, cancel, planos, providerCustomerId consistente | — | BAIXO | — | — |
| Stripe checkout | DONE | subscriptions.ts | Sessão de checkout, Stripe guard em prod | Plano ELITE não implementado | BAIXO | — | — |
| Stripe webhooks | DONE | webhooks.ts | 4 eventos, assinatura verificada, secret obrigatório em prod | Sem log de eventos de pagamento em BD | BAIXO | BAIXA | Adicionar PaymentEvent model |
| GDPR export | DONE | auth.ts | GET /api/auth/export devolve dados em JSON | Não inclui matches/mensagens | BAIXO | BAIXA | Expandir |
| GDPR account deletion | DONE | auth.ts | DELETE /api/auth/account com password confirm, soft-delete, sessão revogada | Hard delete (job 30 dias) não existe | MÉDIO | MÉDIA | Job de hard delete |
| Consent revocation | PARTIAL | schema.prisma | Campo revokedAt existe em UserConsent | Sem endpoint dedicado de revogação | BAIXO | MÉDIA | PUT /api/auth/consents/:type/revoke |
| Legal docs | PARTIAL | docs/legal/ | 11 documentos criados | Revisão jurídica obrigatória antes de produção | ALTO | CRÍTICA | Advogado |
| Tests | PARTIAL | __tests__/ | 39+ testes, GitHub Actions CI | Testes de email verify, Stripe prod, signed URLs em falta | BAIXO | MÉDIA | Sprint de testes |
| Deploy/Railway | DONE | Railway | Frontend + Backend + PostgreSQL + Redis online, v2.4.0 | ts-node em produção (não compilado) | BAIXO | BAIXA | Build tsc |
| Monitoring/logs | NOT_STARTED | — | Apenas console.error | Sem Sentry, sem alertas | MÉDIO | MÉDIA | Sentry ou equivalente |
| Jobs/cron | PARTIAL | src/jobs/ | cleanupExpiredMessages.ts criado | Não corre automaticamente em Railway | BAIXO | BAIXA | Cron Railway |

---

## BLOCKERs actuais para beta privado

1. **Email verification real** — código existe, falta SMTP (Resend)
2. **Moderador activo** — pessoa a monitorizar reports críticos
3. **Railway variables confirmadas** — especialmente CONTACT_HASH_SECRET, JWT secrets

## BLOCKERs para produção pública

1. Revisão jurídica de todos os documentos legais
2. Stripe live após aprovação jurídica
3. DPIA formal completa
4. Hard delete job
5. Signed URLs para fotos privadas
