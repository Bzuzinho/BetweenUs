# Between Us — Estado Real do MVP
> Última actualização: Julho 2026 (pós-auditoria completa)
> ⚠️ Documento interno. Não publicar.

---

## Legenda
- **DONE** — implementado, testado, pronto para beta
- **PARTIAL** — existe mas com gaps conhecidos
- **RISKY** — existe mas com risco técnico, legal ou de segurança activo
- **BLOCKER** — em falta ou quebrado; impede beta público responsável
- **NOT_STARTED** — não implementado

---

| Módulo | Estado | Ficheiros | O que funciona | O que falta | Risco | Prioridade | Próximo passo |
|---|---|---|---|---|---|---|---|
| Auth | DONE | auth.ts, jwt.ts | Registo, login, refresh, logout, cookies httpOnly | Email verification real | MÉDIO | ALTA | Configurar Resend |
| Email verification | BLOCKER | auth.ts | Código implementado | SMTP não configurado; emailVerifiedAt null em prod mas sem envio de link | ALTO | CRÍTICA | Configurar Resend + activar envio |
| Age verification | DONE | auth.ts | Data de nascimento validada (≥18), ageConfirmed obrigatório | ageVerifiedAt nunca é preenchido após selfie | BAIXO | MÉDIA | Preencher ageVerifiedAt quando selfie aprovada |
| Profiles | DONE | profiles.ts, schema | Perfil individual e casal, onboarding 10 passos, DRAFT→PENDING_REVIEW | Coordenadas guardadas em exacto | MÉDIO | MÉDIA | Aplicar coarsenCoordinate antes de guardar |
| Couple profiles | DONE | couples.ts | Double Consent, invite, join, approve | — | BAIXO | — | — |
| Discovery | DONE | discovery.ts | Between Score, filtros, admin excluído, PENDING excluído | Localização sem coarsening | MÉDIO | MÉDIA | Aplicar coarsenCoordinate |
| Matching | DONE | matchService.ts | Single source of truth, couple double consent, PENDING_COUPLE_APPROVAL | — | BAIXO | — | — |
| Chat/conversations | DONE | matches.ts | Membership validation, soft-delete, Socket.io | expiresAt sem job de limpeza | BAIXO | BAIXA | Configurar cron job |
| Private rooms | PARTIAL | MatchesScreen.jsx | Acordo antes do chat, Safe Exit, regras fixadas | Sem UI dedicada no backend | BAIXO | BAIXA | Completar em fase 2 |
| Consent checks | DONE | consent.ts | 7 fases, membership validation, expiração | — | BAIXO | — | — |
| Safety checkins | DONE | safety.ts | Criação, confirmação, cancelamento | Sem alerta automático se não confirmado | BAIXO | BAIXA | Worker de alertas em fase 2 |
| Reports | DONE | reports.ts | 14 categorias, prioridade automática, reincidência | — | BAIXO | — | — |
| Admin | DONE | admin.ts, admin middleware | 9 tabs, RBAC, audit log, risk score, conversas com motivo | Listagem de subscrições em falta no admin | BAIXO | BAIXA | Adicionar tab de subscrições |
| Photos | DONE | photos.ts, imageProcessing.ts | Upload, EXIF strip, blur, moderação em prod, rate limit | URLs permanentes públicas (não signed) | MÉDIO | MÉDIA | Implementar signed URLs |
| Private photo access | DONE | photos.ts | PhotoAccessRequest, aprovação, revogação, match obrigatório | — | BAIXO | — | — |
| Contact blocking | PARTIAL | contacts.ts | HMAC-SHA256, sem fallback em prod | Requer consentimento CONTACT_HASHING (implementado mas não testado E2E) | BAIXO | BAIXA | Teste E2E |
| Privacy settings | DONE | privacy.ts | Invisível (Premium), distância, notificações, allowPhotoRequests | — | BAIXO | — | — |
| Travel mode | DONE | travel.ts | Activar, desactivar, múltiplos destinos | Sem expiração automática | BAIXO | BAIXA | Job de expiração |
| Subscriptions | PARTIAL | subscriptions.ts | Stripe checkout, cancel, planos descritos | Campos stripeCustomerId corrigidos para providerCustomerId | MÉDIO | ALTA | Verificar prod após deploy |
| Stripe webhooks | PARTIAL | webhooks.ts | 4 eventos implementados | STRIPE_WEBHOOK_SECRET obrigatório em prod (corrigido) | MÉDIO | ALTA | Confirmar após próximo deploy |
| GDPR export | DONE | auth.ts | GET /api/auth/export devolve dados em JSON | Não inclui lista de matches/mensagens | BAIXO | BAIXA | Expandir exportação |
| GDPR account deletion | DONE | auth.ts | DELETE /api/auth/account com password, soft-delete, revogação sessão | Hard delete (job 30 dias) não existe | MÉDIO | MÉDIA | Job de hard delete |
| Legal docs | PARTIAL | docs/legal/ | 11 documentos criados | Revisão jurídica obrigatória antes de lançar | ALTO | CRÍTICA | Advogado |
| Tests | DONE | __tests__/ | 39+ testes, GitHub Actions CI | Testes de subscriptions/webhooks em falta | BAIXO | MÉDIA | Adicionar testes T11 |
| Deployment/Railway | DONE | Railway | Frontend + Backend + PostgreSQL + Redis online | ts-node em prod (não compilado) | BAIXO | BAIXA | Considerar build tsc |

---

## BLOCKERs antes de beta público

1. **Email verification real** — sem Resend/SMTP configurado, contas ficam PENDING_VERIFICATION sem conseguir verificar
2. **Revisão legal** — todos os documentos legais requerem advogado antes de qualquer lançamento público
3. **Equipa de moderação** — sem moderadores humanos activos não é seguro abrir ao público
