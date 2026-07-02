# Between Us — Estado Real do MVP
> Última actualização: Julho 2026 — pós-roadmap v2 (rev. 4)
> ⚠️ Documento interno. Actualizar sempre que uma funcionalidade muda.

---

## Legenda
- **DONE** — implementado, testado, sem riscos conhecidos activos
- **PARTIAL** — existe mas com gaps conhecidos
- **RISKY** — risco técnico, legal ou de segurança activo
- **BLOCKER** — impede beta responsável
- **NOT_STARTED** — não implementado

---

| Módulo | Estado | O que funciona | O que falta | Próximo passo |
|---|---|---|---|---|
| Auth | DONE | Registo, login, refresh, logout, rate limit | — | — |
| Email verification | DONE | Endpoints + Resend SMTP configurado, token Redis | Testar em prod | Enviar email de teste |
| Password reset | DONE | forgot + reset com email real | — | — |
| Age verification | DONE | Data nasc. ≥18; ageVerifiedAt preenchido após selfie aprovada | — | — |
| Consentimento granular | DONE | termsAccepted + 3 opcionais; IP e userAgent guardados | Revogar consentimento individual | Endpoint FUTURE |
| Perfis individuais | DONE | Criação, edição, intenções, discretion, city, coordenadas coarsened | — | — |
| Perfis de casal | DONE | Convite, join, Double Consent, separação | — | — |
| Discovery | DONE | Between Score, filtros, HMAC contact block, badges | — | — |
| Between Score | DONE | Score ponderado + explicação visível | Pesos não calibrados com dados reais | Ajustar após beta |
| Matching | DONE | Individual + couple, PENDING_COUPLE_APPROVAL | — | — |
| Double Consent Match | DONE | Aprovação de ambos os parceiros | — | — |
| Chat | DONE | Tempo real (Socket.io), membership validation, soft-delete | cron para expiresAt | Configurar Railway cron |
| Private rooms | PARTIAL | UI: Modo Acordo + Safe Exit | Backend dedicado | Fase 2 |
| Consent checks | DONE | 7 fases, membership, expiração | — | — |
| Safety checkins | DONE | Criação, confirmação, cancelamento | Alerta automático se não confirmado | Fase 2 |
| Reports | DONE | 14 categorias, prioridade auto, reincidência | — | — |
| Admin panel | DONE | 9 tabs, RBAC 6 roles, audit log, customer support, histórico | — | — |
| Photos | DONE | Upload, EXIF strip, blur, moderação, rate limit | URLs permanentes (não signed) | Fase 2 |
| Soft Reveal | DONE | 4 níveis de visibilidade | — | — |
| Contact blocking | DONE | HMAC-SHA256, sem fallback em prod, requer consentimento | — | — |
| Privacy settings | DONE | Invisível (Premium gate), distância, notificações, foto requests | — | — |
| Travel mode | DONE | Activar/desactivar, múltiplos destinos | Sem expiração automática | Fase 2 |
| Subscriptions | DONE | Stripe checkout, cancel, providerCustomerId consistente | — | — |
| Stripe webhooks | DONE | 4 eventos, assinatura verificada, secret obrigatório em prod | — | — |
| GDPR export | DONE | GET /api/auth/export | Não inclui mensagens | Fase 2 |
| GDPR account deletion | DONE | DELETE /api/auth/account, soft-delete, sessão revogada | Hard delete job 30d | Fase 2 |
| Legal docs | PARTIAL | 11 templates criados | Revisão jurídica | Advogado antes de produção |
| Tests | PARTIAL | 39+ testes, CI GitHub Actions | Testes email, Stripe prod | Sprint de testes |
| Deploy/Railway | DONE | Frontend + Backend + PostgreSQL + Redis | ts-node em prod | Compilar com tsc em v1.0 |
| Monitoring | NOT_STARTED | — | Sentry | Antes de v1.0 |
| Jobs/cron | PARTIAL | cleanupExpiredMessages.ts criado | Não corre no Railway | Configurar cron |
| Profile page | DONE | Status badges, email banner, quick links, RGPD links | — | — |
| Password recovery | DONE | forgot + reset via Resend | — | — |

---

## Posição no roadmap

| Versão | Estado | Notas |
|---|---|---|
| v0.1 Protótipo | ✅ DONE | |
| v0.2 MVP técnico | ✅ DONE | |
| v0.3 Beta privado | 🟡 98% | Falta: moderador humano activo, domínio próprio |
| v1.0 Lançamento | 🔲 65% | Falta: landing, Sentry, Stripe live, legal review |
| v1.5 Crescimento | 🔲 30% | Travel Mode feito, resto por fazer |
| v2.0 App mobile | 🔲 0% | |

---

## Bloqueadores actuais

| # | Bloqueador | Solução |
|---|---|---|
| 1 | Moderador humano activo | Designar alguém para rever fotos e reports |
| 2 | Domínio próprio | DNS no Railway — 10 minutos |
| 3 | Revisão jurídica | Advogado antes de qualquer lançamento público |
