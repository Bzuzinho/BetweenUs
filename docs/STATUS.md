# Between Us — Estado de Desenvolvimento
> Documento vivo. Atualizado a cada sprint.
> Última atualização: Jun 29, 2026 — Sprints A.1 → C.4 + 9.1 completos

---

## 🚀 Produção

| Serviço | URL | Estado |
|---|---|---|
| Frontend | https://betweenus-production.up.railway.app | ✅ Online |
| Backend API | https://fearless-stillness-production-e5f6.up.railway.app | ✅ Online v2.1.0 |
| PostgreSQL | Railway internal | ✅ Online |
| Redis | Railway internal | ✅ Online — refresh token hash |
| Storage | Cloudflare R2 (betweenus) | ✅ Configurado |
| Pagamentos | Stripe (modo teste) | ✅ Configurado |
| Email | Resend | ❌ SMTP por configurar |

---

## ✅ Sprints Completos (34 total)

### Fases 0-8 (base do produto)
0.1, 1.1, 1.2, 2.1, 2.2, 2.4, 3.1, 3.2, 3.3, 4.1, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 7.1, 7.1b, 8.1, 8.2, 8.4 — ver histórico completo abaixo.

### Fase A — Débito técnico crítico ✅ COMPLETA
| ID | Sprint | Detalhe |
|---|---|---|
| A.1 | Admin isolado do discovery | Admins excluídos do feed via `adminRole: null` |
| A.2 | Fotos PENDING em produção | Sem auto-approve; validação MIME real |
| A.3 | Autorização em matches/chat | Só participantes acedem a mensagens |
| A.4 | Refresh token via Redis | Hash SHA-256 + rotação real; `DELETE /api/auth/sessions` |
| A.5 | Email templates Resend-ready | Verificação, reset, boas-vindas, match |

### Fase B — Produto diferenciador ✅ COMPLETA
| ID | Sprint | Detalhe |
|---|---|---|
| B.1 | Perfis PENDING_REVIEW em produção | Moderação obrigatória antes do discovery |
| B.2 | Intenções com YES/MAYBE/NO | Preferência por intenção individual |
| B.3 | Seed expandido | 16 intenções + 21 categorias de boundaries |
| B.4 | Double Consent real | `POST /api/couples/like/:id` exige aprovação de ambos |
| B.5 | Soft Reveal — Acordo before chat | Modal com 5 perguntas, fixado no topo |
| B.6 | Acordo antes do chat | Integrado em B.5 |
| B.7 | Safe Exit real | 6 opções: arquivar, silenciar, revogar fotos, bloquear, reportar, sair |
| B.8 | Sala privada completa | Regras visíveis, estado de consentimento, header com contexto |

### Fase C — Privacidade avançada (parcial)
| ID | Sprint | Estado |
|---|---|---|
| C.1 | Modo discreto completo | ✅ PrivacySettingsPage — invisible, ocultar distância/cidade, notificações 3 níveis |
| C.2 | HMAC-SHA256 contactos | ✅ Substituído SHA-256 simples por HMAC com `CONTACT_HASH_SECRET` |
| C.3 | Verificação por níveis | ✅ 6 badges: email, idade, selfie, casal, fotos, premium |
| C.4 | Between Score explicado | ✅ `scoreExplanation` + `scoreFactors` + `scoreWarnings` na API |
| C.5 | Reputação interna (risk score) | 🔲 Pendente |

### Fase 9 — Beta (parcial)
| ID | Sprint | Estado |
|---|---|---|
| 9.1 | Beta fechado | ✅ `/join/:code`, validação de convite, gate de registo |
| 9.2 | Onboarding progressivo | 🔲 Pendente |
| 9.3 | Between Guide | 🔲 Pendente (mockup existe) |
| 9.4 | Lançamento v1.0 | 🔲 Pendente |

---

## 🔜 Sprints Seguintes

| ID | Sprint | Prioridade |
|---|---|---|
| C.5 | Reputação interna — risk score automático | Média |
| 9.2 | Onboarding progressivo — 10 passos com DRAFT | Alta |
| 9.3 | Between Guide — 10+ artigos educativos | Média |
| 9.4 | Lançamento v1.0 — Stripe live, moderação ativa | — |

---

## 📁 Estrutura Atual

```
BetweenUs/
├── client/src/
│   ├── App.jsx                       # Router com /join, /privacy-settings
│   ├── AppShell.jsx                  # Shell com nav real
│   ├── pages/
│   │   ├── LoginPage.jsx             ✅
│   │   ├── RegisterPage.jsx          ✅
│   │   ├── CreateProfilePage.jsx     ✅
│   │   ├── ProfilePage.jsx           ✅ Com quick links completos
│   │   ├── PhotosPage.jsx            ✅ Soft Reveal 4 níveis
│   │   ├── CouplePage.jsx            ✅ Double Consent
│   │   ├── PremiumPage.jsx           ✅ Stripe checkout
│   │   ├── VerificationPage.jsx      ✅ Selfie + gesto
│   │   ├── ContactsBlockPage.jsx     ✅ HMAC blocking
│   │   ├── PrivacySettingsPage.jsx   ✅ NOVO — modo discreto completo
│   │   └── BetaJoinPage.jsx          ✅ NOVO — gate de convite
│   └── screens/
│       ├── ExploreScreen.jsx         ✅ Badges + score explicado
│       ├── MatchesScreen.jsx         ✅ Acordo + Safe Exit + sala privada
│       └── GuideScreen.jsx           📋 Mockup (Sprint 9.3 pendente)
│
├── server/src/
│   ├── index.ts                      # v2.1.0 — todas as rotas
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── admin.ts                  # Roles + logAdminAction
│   └── routes/
│       ├── auth.ts                   ✅ Refresh token via Redis hash
│       ├── profiles.ts               ✅ PENDING_REVIEW em prod
│       ├── discovery.ts              ✅ Admin excluído + badges + score explicado
│       ├── matches.ts                ✅ Autorização real
│       ├── couples.ts                ✅ Double Consent completo
│       ├── photos.ts                 ✅ PENDING em prod
│       ├── privacy.ts                ✅
│       ├── contacts.ts               ✅ HMAC-SHA256
│       ├── reports.ts                ✅
│       ├── verifications.ts          ✅
│       ├── subscriptions.ts          ✅ Stripe
│       ├── webhooks.ts               ✅ Stripe 5 eventos
│       ├── admin.ts                  ✅ Dashboard completo
│       ├── travel.ts                 ✅
│       ├── consent.ts                ✅
│       ├── safety.ts                 ✅
│       └── beta.ts                   ✅ NOVO — validate + use invite
│
└── docs/
    ├── STATUS.md                     # Este ficheiro
    └── SPRINTS.md                    # Roadmap
```

---

## ⚠️ Débito Técnico Pendente

| Item | Prioridade |
|---|---|
| Email SMTP (Resend) por configurar no Railway | ALTA |
| Tokens em localStorage (mover para httpOnly cookies) | MÉDIA |
| Gerar versão blurred real (sharp.js) | MÉDIA |
| Rate limiting em likes/mensagens | MÉDIA |
| C.5 — Risk score automático | MÉDIA |
| Onboarding progressivo (DRAFT por passo) | ALTA |
| CONTACT_HASH_SECRET — adicionar variável no Railway | ALTA |

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
| **CONTACT_HASH_SECRET** | ❌ **novo — por adicionar** |
| SMTP_HOST | ❌ pendente |
| SMTP_PASS | ❌ pendente |
| EMAIL_FROM | ❌ pendente |
