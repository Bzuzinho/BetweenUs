# Between Us — Estado de Desenvolvimento
> Documento vivo. Atualizado automaticamente a cada sprint.
> Última atualização: Jun 29, 2026 — Sprint A.1 → B.3

---

## 🚀 Produção

| Serviço | URL | Estado |
|---|---|---|
| Frontend | https://betweenus-production.up.railway.app | ✅ Online |
| Backend API | https://fearless-stillness-production-e5f6.up.railway.app | ✅ Online |
| PostgreSQL | Railway internal | ✅ Online |
| Redis | Railway internal | ✅ Online |
| Storage | Cloudflare R2 (betweenus) | ✅ Configurado |
| Pagamentos | Stripe (modo teste) | ✅ Configurado |
| Email | Resend | ❌ SMTP por configurar |

---

## ✅ Sprints Completos (26 total)

| ID | Sprint | Notas |
|---|---|---|
| 0.1 | Setup infraestrutura | Railway, PostgreSQL, Redis |
| 1.1 | Autenticação | JWT, register, login |
| 1.2 | Consentimento RGPD | Termos, age gate |
| 2.1 | Perfil individual | CRUD + intenções |
| 2.2 | Perfil de casal | Convite + Double Consent |
| 2.4 | Upload de fotos | R2 + Soft Reveal |
| 3.1 | Discovery feed | Perfis reais da BD |
| 3.2 | Between Score | Algoritmo compatibilidade |
| 3.3 | Likes & Matches | Match mútuo |
| 4.1 | Chat real | Mensagens na BD |
| 5.1 | Privacidade | Modo Invisível |
| 5.2 | Bloqueio contactos | SHA-256 RGPD |
| 5.3 | Denúncias | Report system |
| 5.4 | Verificação | Selfie + admin review |
| 6.1 | Admin v1 | Stats, users, reports |
| 6.2 | Admin v2 | Roles, dashboard, audit |
| 7.1 | Subscrições | Freemium |
| 7.1b | Stripe real | Checkout + webhooks |
| 8.1 | Travel Mode | Disponibilidade por cidade |
| 8.2 | Consent Check | 8 fases |
| 8.4 | Check-in segurança | Safety checkin |
| **A.1** | **Admin isolado discovery** | ✅ Admins filtrados do feed |
| **A.2** | **Fotos PENDING em prod** | ✅ Sem auto-approve em produção |
| **A.3** | **Auth em matches/chat** | ✅ Só participantes acedem |
| **A.4** | **Refresh token Redis** | ✅ Hash + rotação real |
| **A.5** | **Email templates** | ✅ Resend-ready (falta config) |
| **B.1** | **Perfis PENDING em prod** | ✅ Review obrigatória |
| **B.2** | **Intenções YES/MAYBE/NO** | ✅ Preferência por intenção |
| **B.3** | **Boundaries expandidos** | ✅ 21 categorias no seed |

---

## 🔜 Próximos Sprints

### Prioridade Alta
| ID | Sprint |
|---|---|
| B.4 | Double Consent real (likes, fotos, chat) |
| B.5 | Soft Reveal 5 fases completo |
| B.6 | Acordo antes do chat |
| B.7 | Safe Exit real (8 opções) |
| B.8 | Sala privada com consentimento visível |
| 9.1 | Beta fechado (convites por código) |

### Prioridade Média
| ID | Sprint |
|---|---|
| C.1 | Modo discreto completo (PIN, biometria) |
| C.2 | HMAC-SHA256 contactos |
| C.3 | Verificação por níveis (6 badges) |
| C.4 | Between Score explicado |
| C.5 | Reputação interna (risk score) |
| 9.2 | Onboarding progressivo (10 passos) |
| 9.3 | Between Guide (10+ artigos) |
| 9.4 | Lançamento v1.0 |

---

## ⚠️ Débito Técnico Resolvido

| Item | Estado |
|---|---|
| Admin aparecia no discovery | ✅ Resolvido A.1 |
| Fotos auto-aprovadas em prod | ✅ Resolvido A.2 |
| Qualquer user lia mensagens com matchId | ✅ Resolvido A.3 |
| Refresh token não validado | ✅ Resolvido A.4 |
| Email sem templates | ✅ Resolvido A.5 |
| CORS permissivo em prod | ✅ Resolvido |
| /debug em produção | ✅ Resolvido |

## ⚠️ Débito Técnico Pendente

| Item | Prioridade |
|---|---|
| Email SMTP (Resend) por configurar no Railway | ALTA |
| Tokens em localStorage (mover para httpOnly cookies) | MÉDIA |
| HMAC-SHA256 para contactos | MÉDIA |
| Gerar versão blurred real (sharp.js) | MÉDIA |
| Rate limiting em likes/mensagens | MÉDIA |

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
| SMTP_HOST | ❌ pendente |
| SMTP_PASS | ❌ pendente |
| EMAIL_FROM | ❌ pendente |
