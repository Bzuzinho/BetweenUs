# Between Us — Estado Real do MVP
> Última actualização: Julho 2026 — pós-roadmap v2 (rev. 5)
> ⚠️ Documento interno. Actualizar sempre que uma funcionalidade muda.
> Regra: se a documentação e o código divergem, a documentação está errada.

---

## Posição no roadmap

| Versão | Estado | Notas |
|---|---|---|
| v0.1 Protótipo | ✅ DONE | |
| v0.2 MVP técnico | ✅ DONE | |
| v0.3 Beta privado | 🟡 99% | Falta apenas moderador humano activo |
| v1.0 Lançamento | 🔲 68% | Falta: landing, Sentry, Stripe live, revisão legal |
| v1.5 Crescimento | 🔲 35% | Travel Mode feito; Private Room, eventos por fazer |
| v2.0 App mobile | 🔲 0% | PWA activa em substituição |

---

## Módulos — estado actual

| Módulo | Estado | O que funciona | O que falta |
|---|---|---|---|
| Auth | ✅ DONE | Registo, login, refresh, logout, rate limit | — |
| Email verification | ✅ DONE | Endpoints + Resend SMTP, token Redis | Testar fluxo em prod |
| Password reset | ✅ DONE | forgot + reset com email real | — |
| Age verification | ✅ DONE | Data nasc. ≥18; ageVerifiedAt preenchido após selfie | — |
| Consentimento | ✅ DONE | termsAccepted + opcionais; IP/userAgent gravados | Endpoint revogação individual |
| Perfis individuais | ✅ DONE | Criação, edição dedicada (/edit-profile), intenções, discretion | — |
| Editar perfil | ✅ DONE | EditProfilePage + PUT /profiles/me separados do create | — |
| Perfis de casal | ✅ DONE | Convite, join, Double Consent, separação | — |
| Discovery | ✅ DONE | Between Score, filtros, HMAC contact block, badges | — |
| Between Score | ✅ DONE | Score ponderado + explicação visível | Pesos por calibrar com dados reais |
| Matching | ✅ DONE | Individual + couple, PENDING_COUPLE_APPROVAL | — |
| Double Consent Match | ✅ DONE | Aprovação de ambos os parceiros | — |
| Chat | ✅ DONE | Tempo real (Socket.io), membership validation | cron para expiresAt |
| Consent checks | ✅ DONE | 7 fases, membership, expiração | — |
| Safety checkins | ✅ DONE | Criação, confirmação, cancelamento | Alertas automáticos (Fase 2) |
| Reports | ✅ DONE | 14 categorias, prioridade auto, reincidência | — |
| Admin panel | ✅ DONE | Header user+sino+menu, tabs compactas, RBAC, audit, histórico | — |
| Service sessions | ✅ DONE | Moderador/Suporte entra/sai ao serviço, notifica admins | — |
| Notificações admin | ✅ DONE | Bell com badge, CRUD, limpar tudo | Push nativas (Fase 2) |
| Gestão de roles | ✅ DONE | SUPER_ADMIN cria utilizadores e atribui roles | — |
| Customer support | ✅ DONE | Editar utilizador/perfil com motivo + histórico completo | — |
| Photos | ✅ DONE | Upload, EXIF strip, blur, moderação, rate limit | Signed URLs (Fase 2) |
| Soft Reveal | ✅ DONE | 4 níveis de visibilidade | — |
| Contact blocking | ✅ DONE | HMAC-SHA256, sem fallback em prod, requer consentimento | — |
| Privacy settings | ✅ DONE | Invisível (Premium gate), distância, notificações | — |
| Travel mode | ✅ DONE | Activar/desactivar, múltiplos destinos | Expiração automática |
| Subscriptions | ✅ DONE | Stripe checkout, cancel, campos consistentes | — |
| Stripe webhooks | ✅ DONE | 4 eventos, assinatura verificada | — |
| GDPR export | ✅ DONE | GET /api/auth/export | Matches/mensagens (Fase 2) |
| GDPR delete | ✅ DONE | DELETE /api/auth/account, soft-delete, sessão revogada | Hard delete job 30d |
| Design v3 | ✅ DONE | Option 3 palette (dark teal + lavender) em todas as páginas | — |
| Legal docs | 🟡 PARTIAL | 11 templates criados | Revisão jurídica |
| Tests | 🟡 PARTIAL | 39+ testes, CI GitHub Actions | Testes email verify, Stripe prod |
| Deploy/Railway | ✅ DONE | Frontend + Backend + PostgreSQL + Redis | ts-node (melhorar em v1.0) |
| Monitoring | ❌ NOT_STARTED | — | Sentry antes de v1.0 |
| Landing page | ❌ NOT_STARTED | — | Necessário para v1.0 |
| Hard delete job | ❌ NOT_STARTED | Soft-delete existe | Job 30 dias |

---

## Bloqueadores actuais para beta privado

| # | Bloqueador | Acção necessária |
|---|---|---|
| 1 | **Moderador humano activo** | Designar — o SUPER_ADMIN pode ser ele próprio |
| 2 | **Revisão legal** (para produção) | Advogado antes de lançamento público |

**Nota:** o SUPER_ADMIN pode desempenhar o papel de moderador usando o painel admin. O sistema de service sessions regista a entrada/saída ao serviço e notifica outros admins. Não há bloqueador técnico para beta privado.

---

## Sprints completos (do roadmap v2)

| Sprint | Descrição | Estado |
|---|---|---|
| 1 | Setup, auth, CI/CD | ✅ |
| 2 | Perfis, intenções, limites, fotos | ✅ |
| 3 | Discovery, filtros, between score | ✅ |
| 4 | Matching, double consent | ✅ |
| 5 | Chat, denúncias, bloqueios | ✅ |
| 6 | Privacidade, moderação, admin | ✅ |
| 7 | Stripe, subscrições | ✅ |
| 8 | Beta fechado, convites, service sessions | ✅ |

---

## Alterações desta sessão (rev. 5)

- **Fix crítico:** botão "Editar perfil" apontava para `/create-profile` → novo `/edit-profile` com `EditProfilePage` dedicada e `PUT /profiles/me` no backend
- **Admin redesign completo:** header com utilizador + sino de notificações + menu; tabs compactas horizontais sem scroll em grid; StatCards clicáveis que navegam para tab certa; modo serviço para Moderador/Suporte; auditoria com sessões de serviço
- **Notificações admin:** bell com badge, CRUD, auto-reload 30s
- **Service sessions:** Moderador/Suporte entra/sai ao serviço → notifica admins → registo de duração em auditoria
- **Schema:** Notification + ServiceSession models adicionados
