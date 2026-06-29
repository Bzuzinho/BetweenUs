# Between Us — Estado de Desenvolvimento
> Documento vivo. Atualizado a cada sprint.
> Última atualização: Jun 29, 2026

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

---

## 📊 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express + TypeScript + ts-node |
| ORM | Prisma 5 |
| Base de dados | PostgreSQL (Railway) |
| Cache/Filas | Redis (Railway) |
| Storage | Cloudflare R2 (S3-compatible) |
| WebSockets | Socket.io |
| Pagamentos | Stripe (checkout + webhooks) |
| Email | Nodemailer (a configurar Resend) |
| Deploy | Railway (auto-deploy via GitHub) |
| Repositório | github.com/Bzuzinho/BetweenUs |

---

## ✅ Sprints Completos

### Fase 0 — Infraestrutura
| Sprint | Descrição | Estado |
|---|---|---|
| 0.1 | Setup — monorepo /client + /server, Railway, PostgreSQL, Redis, CI/CD | ✅ |

### Fase 1 — Autenticação
| Sprint | Descrição | Estado |
|---|---|---|
| 1.1 | Auth — registo, login, JWT (access 7d + refresh 30d), logout | ✅ |
| 1.2 | Consentimento — RGPD, termos, age gate, apagar conta | ✅ |

### Fase 2 — Perfis
| Sprint | Descrição | Estado |
|---|---|---|
| 2.1 | Perfil individual — criar, editar, intenções, limites | ✅ |
| 2.2 | Perfil de casal — convite, Double Consent Match | ✅ |
| 2.4 | Fotos — upload S3/R2, Soft Reveal 4 níveis, moderação PENDING | ✅ |

### Fase 3 — Discovery & Matching
| Sprint | Descrição | Estado |
|---|---|---|
| 3.1 | Discovery feed — perfis reais da BD, filtros, exclusões | ✅ |
| 3.2 | Between Score — algoritmo de compatibilidade | ✅ |
| 3.3 | Likes & Matches — match mútuo automático, Double Consent | ✅ |

### Fase 4 — Chat
| Sprint | Descrição | Estado |
|---|---|---|
| 4.1 | Chat real — mensagens na BD, sala privada, chat em tempo real | ✅ |

### Fase 5 — Privacidade & Segurança
| Sprint | Descrição | Estado |
|---|---|---|
| 5.1 | Privacidade — Modo Invisível, toggles, configurações | ✅ |
| 5.2 | Bloqueio de contactos — SHA-256 hash, RGPD compliant | ✅ |
| 5.3 | Denúncias — reportar perfis e mensagens | ✅ |
| 5.4 | Verificação — selfie + gesto, admin review, selo verificado | ✅ |

### Fase 6 — Admin
| Sprint | Descrição | Estado |
|---|---|---|
| 6.1 | Admin v1 — stats, users, reports | ✅ |
| 6.2 | Admin v2 — roles reais (6 roles), dashboard completo, fotos, audit log, beta invites | ✅ |

### Fase 7 — Monetização
| Sprint | Descrição | Estado |
|---|---|---|
| 7.1 | Subscrições — planos Free/Premium/Casal | ✅ |
| 7.1b | Stripe real — checkout, customer portal, webhooks (5 eventos) | ✅ |

### Fase 8 — Features Avançadas
| Sprint | Descrição | Estado |
|---|---|---|
| 8.1 | Travel Mode — disponibilidade por cidade/data, expiração automática | ✅ |
| 8.2 | Consent Check — consentimento por fases (8 fases) | ✅ |
| 8.4 | Check-in de encontro — segurança, confirmar, cancelar | ✅ |

---

## 🔜 Sprints Seguintes (por ordem de prioridade)

### Prioridade CRÍTICA — antes do beta

| Sprint | Descrição | Ficheiros a criar |
|---|---|---|
| **A.1** | Admin sem perfil de match — admin não aparece no discovery | `server/src/middleware/admin.ts` (update discovery) |
| **A.2** | Moderação de fotos com fila real — PENDING por defeito, sem auto-approve | `server/src/routes/photos.ts` update |
| **A.3** | Autorização em matches/chats — validar que user pertence ao match | `server/src/routes/matches.ts` update |
| **A.4** | Refresh token validado contra Redis — rotação real | `server/src/routes/auth.ts` update |
| **A.5** | Remover /debug em produção | `server/src/index.ts` ✅ já feito |
| **A.6** | CORS estrito em produção | `server/src/index.ts` ✅ já feito |

### Prioridade ALTA — produto diferenciador

| Sprint | Descrição |
|---|---|
| **B.1** | Perfil relacional completo — dinâmicas, tipos expandidos |
| **B.2** | Mapa de intenções com YES/MAYBE/NO por intenção |
| **B.3** | Mapa de limites expandido — 16+ categorias |
| **B.4** | Double Consent real — likes, superlikes, pedidos de foto, abertura de chat |
| **B.5** | Soft Reveal por fases — 5 níveis com pedido + aprovação + revogação |
| **B.6** | Acordo antes do chat — mini acordo fixado no topo da sala |
| **B.7** | Safe Exit real — 8 opções, revogar fotos, bloquear, reportar |
| **B.8** | Sala privada com regras fixadas, estado do consentimento visível |

### Prioridade MÉDIA — privacidade completa

| Sprint | Descrição |
|---|---|
| **C.1** | Modo discreto completo — PIN, biometria, notificações discretas, saída rápida |
| **C.2** | Bloqueio de conhecidos melhorado — HMAC-SHA256 com segredo servidor |
| **C.3** | Verificação por níveis — 6 badges diferentes |
| **C.4** | Between Score explicado — mostrar fatores ao utilizador |
| **C.5** | Reputação interna discreta — score de risco para moderação |

### Fase 9 — Beta & Lançamento

| Sprint | Descrição |
|---|---|
| **9.1** | Beta fechado — convites por código, métricas, feedback |
| **9.2** | Onboarding progressivo — 10 passos, guardar como DRAFT |
| **9.3** | Between Guide — 10+ artigos educativos |
| **9.4** | Lançamento v1.0 — PWA pública, Stripe live, moderação ativa |

---

## 📁 Estrutura de Ficheiros

```
BetweenUs/
├── client/                          # Frontend React + Vite
│   ├── src/
│   │   ├── App.jsx                  # Router principal
│   │   ├── AppShell.jsx             # Shell com navegação real
│   │   ├── BetweenUsApp.jsx         # Protótipo original (a substituir)
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Estado global de auth
│   │   ├── lib/
│   │   │   └── api.js               # Axios + interceptors
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        ✅ Real
│   │   │   ├── RegisterPage.jsx     ✅ Real
│   │   │   ├── CreateProfilePage.jsx ✅ Real
│   │   │   ├── ProfilePage.jsx      ✅ Real
│   │   │   ├── PhotosPage.jsx       ✅ Real
│   │   │   ├── CouplePage.jsx       ✅ Real
│   │   │   ├── PremiumPage.jsx      ✅ Real (Stripe)
│   │   │   ├── VerificationPage.jsx ✅ Real
│   │   │   ├── ContactsBlockPage.jsx ✅ Real
│   │   │   ├── TravelPage.jsx       ✅ Real
│   │   │   ├── CheckInPage.jsx      ✅ Real
│   │   │   ├── AdminPage.jsx        ✅ Real
│   │   │   └── DebugPage.jsx        ⚠️ Dev only
│   │   └── screens/
│   │       ├── ExploreScreen.jsx    ✅ Real (API)
│   │       ├── MatchesScreen.jsx    ✅ Real (API + Chat)
│   │       └── GuideScreen.jsx      📋 Mockup
│
├── server/                          # Backend Node.js + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma            # Schema v4 — 24 modelos
│   │   └── seed.ts                  # Seed de intenções e boundaries
│   └── src/
│       ├── index.ts                 # Express + Socket.io + todas as rotas
│       ├── lib/
│       │   ├── prisma.ts            # Prisma singleton
│       │   ├── redis.ts             # Redis client
│       │   └── storage.ts           # Cloudflare R2 / S3
│       ├── middleware/
│       │   ├── auth.ts              # JWT middleware
│       │   └── admin.ts             # Roles + permissões + logAdminAction
│       ├── routes/
│       │   ├── auth.ts              ✅ register, login, logout, refresh, me
│       │   ├── profiles.ts          ✅ CRUD + boundaries + privacy
│       │   ├── discovery.ts         ✅ feed + Between Score + like/pass
│       │   ├── matches.ts           ✅ list + messages + send
│       │   ├── couples.ts           ✅ create + invite + join + approve
│       │   ├── photos.ts            ✅ upload + visibility + delete
│       │   ├── privacy.ts           ✅ settings + invisible + block
│       │   ├── contacts.ts          ✅ hash blocking + GDPR
│       │   ├── reports.ts           ✅ submit report
│       │   ├── verifications.ts     ✅ selfie + admin review
│       │   ├── subscriptions.ts     ✅ Stripe checkout + portal + cancel
│       │   ├── webhooks.ts          ✅ Stripe 5 eventos
│       │   ├── admin.ts             ✅ dashboard + users + profiles + photos + reports + audit + beta
│       │   ├── travel.ts            ✅ travel mode
│       │   ├── consent.ts           ✅ consent check por fases
│       │   ├── safety.ts            ✅ check-in de segurança
│       │   └── beta.ts              ✅ beta invites
│       └── utils/
│           ├── jwt.ts               # Token generation/verification
│           └── email.ts             # Email templates
│
└── docs/
    ├── STATUS.md                    # Este ficheiro — estado vivo
    ├── SPRINTS.md                   # Roadmap de sprints
    └── FEATURES.md                  # Lista de features
```

---

## 🔑 API Endpoints (todos ativos)

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/password/forgot
```

### Profiles
```
POST   /api/profiles
GET    /api/profiles/me
GET    /api/profiles/:id
PUT    /api/profiles/:id
PUT    /api/profiles/:id/boundaries
PUT    /api/profiles/:id/privacy
```

### Discovery
```
GET    /api/discovery
POST   /api/discovery/:id/like
POST   /api/discovery/:id/pass
```

### Matches & Chat
```
GET    /api/matches
GET    /api/matches/:id/messages
POST   /api/matches/:id/messages
```

### Couples
```
POST   /api/couples
GET    /api/couples/me
POST   /api/couples/join/:token
POST   /api/couples/matches/:id/approve
PUT    /api/couples/me
DELETE /api/couples/me
```

### Photos
```
POST   /api/photos
GET    /api/photos/me
PUT    /api/photos/:id
DELETE /api/photos/:id
POST   /api/photos/:id/request-access
```

### Privacy & Safety
```
GET    /api/privacy
PUT    /api/privacy
POST   /api/privacy/block/:profileId
POST   /api/contacts/block
GET    /api/contacts/blocked/count
DELETE /api/contacts/blocked
POST   /api/reports
POST   /api/safety/checkin
PUT    /api/safety/checkin/:id/confirm
PUT    /api/safety/checkin/:id/cancel
GET    /api/safety/checkins/me
```

### Verifications
```
GET    /api/verifications/me
POST   /api/verifications/submit
```

### Subscriptions & Payments
```
GET    /api/subscriptions/plans
GET    /api/subscriptions/me
POST   /api/subscriptions/checkout
POST   /api/subscriptions/portal
POST   /api/subscriptions/cancel
POST   /api/subscriptions/upgrade
POST   /api/webhooks/stripe
```

### Travel & Consent
```
GET    /api/travel/me
POST   /api/travel
DELETE /api/travel/:id
POST   /api/consent/check
PUT    /api/consent/check/:id
GET    /api/consent/match/:matchId
```

### Admin (requer role)
```
GET    /api/admin/dashboard
GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id/status
PUT    /api/admin/users/:id/role
GET    /api/admin/profiles
PUT    /api/admin/profiles/:id/status
GET    /api/admin/photos
PUT    /api/admin/photos/:id
GET    /api/admin/reports
PUT    /api/admin/reports/:id
GET    /api/admin/verifications
PUT    /api/admin/verifications/:userId
GET    /api/admin/audit
GET    /api/admin/beta/invites
POST   /api/admin/beta/invites
PUT    /api/admin/beta/invites/:id/toggle
```

---

## ⚠️ Pendente / Débito Técnico

| Item | Prioridade | Notas |
|---|---|---|
| Admin não deve aparecer no discovery | CRÍTICA | Filtrar adminRole != null no discovery |
| Fotos PENDING não devem aparecer no discovery | CRÍTICA | Já no schema, falta filtrar na query |
| Autorização em matches — validar membership | ALTA | Qualquer user com matchId pode ler mensagens |
| Refresh token — validar hash contra Redis | ALTA | Atualmente aceita qualquer token JWT válido |
| Tokens em localStorage — mover para httpOnly cookies | MÉDIA | Vulnerável a XSS |
| HMAC-SHA256 para contactos (vs SHA-256 simples) | MÉDIA | Mais seguro com segredo do servidor |
| Cloudflare R2 — gerar versão blurred real | MÉDIA | Atualmente usa placeholder |
| Moderação de fotos — auto-approve em dev | MÉDIA | Remover em produção |
| Email — configurar Resend para envio real | ALTA | Atualmente sem envio |
| Rate limiting em likes/mensagens | MÉDIA | Prevenir spam |
| Remover /debug endpoint | ✅ Feito | Só em dev |
| CORS estrito | ✅ Feito | Prod bloqueado |

---

## 🔧 Variáveis de Ambiente (Railway — fearless-stillness)

| Variável | Estado |
|---|---|
| `DATABASE_URL` | ✅ |
| `REDIS_URL` | ✅ |
| `JWT_SECRET` | ✅ |
| `JWT_REFRESH_SECRET` | ✅ |
| `CLIENT_URL` | ✅ |
| `NODE_ENV` | ✅ |
| `PORT` | ✅ |
| `ADMIN_EMAILS` | ✅ |
| `STORAGE_ENDPOINT` | ✅ R2 |
| `STORAGE_ACCESS_KEY` | ✅ R2 |
| `STORAGE_SECRET_KEY` | ✅ R2 |
| `STORAGE_BUCKET` | ✅ R2 |
| `STORAGE_PUBLIC_URL` | ✅ R2 |
| `STRIPE_SECRET_KEY` | ✅ test |
| `STRIPE_WEBHOOK_SECRET` | ✅ test |
| `STRIPE_PRICE_PREMIUM` | ✅ test |
| `STRIPE_PRICE_COUPLE` | ✅ test |
| `SMTP_HOST` | ❌ Resend por configurar |
| `SMTP_USER` | ❌ |
| `SMTP_PASS` | ❌ |
