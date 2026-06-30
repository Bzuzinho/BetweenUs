# Between Us — Estado de Desenvolvimento
> Documento vivo. Atualizado a cada sprint.
> Última atualização: Jun 29, 2026 — TODOS OS SPRINTS DO ROADMAP COMPLETOS (38)

---

## 🎉 Marco: Roadmap completo

Todos os sprints planeados desde o documento de especificação v2.0 estão implementados.
A aplicação está pronta para testes de beta fechado, com algumas configurações finais pendentes (ver secção Pré-Lançamento abaixo).

---

## 🚀 Produção

| Serviço | URL | Estado |
|---|---|---|
| Frontend | https://betweenus-production.up.railway.app | ✅ Online |
| Backend API | https://fearless-stillness-production-e5f6.up.railway.app | ✅ v2.2.0 |
| PostgreSQL | Railway internal | ✅ Online |
| Redis | Railway internal | ✅ Online |
| Storage | Cloudflare R2 (betweenus) | ✅ Configurado |
| Pagamentos | Stripe (modo teste) | ✅ Configurado |
| Email | Resend | ❌ SMTP por configurar |

---

## ✅ Sprints Completos (38 total — 100% do roadmap)

### Fases 0-8 — Base do produto (21 sprints)
0.1, 1.1, 1.2, 2.1, 2.2, 2.4, 3.1, 3.2, 3.3, 4.1, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 7.1, 7.1b, 8.1, 8.2, 8.4

### Fase A — Débito técnico crítico (5 sprints) ✅
A.1 Admin isolado · A.2 Fotos PENDING produção · A.3 Auth matches/chat ·
A.4 Refresh token Redis · A.5 Email templates

### Fase B — Produto diferenciador (8 sprints) ✅
B.1 Perfis PENDING_REVIEW · B.2 Intenções YES/MAYBE/NO · B.3 Seed expandido ·
B.4 Double Consent real · B.5-B.6 Acordo antes do chat · B.7 Safe Exit real ·
B.8 Sala privada completa

### Fase C — Privacidade avançada (5 sprints) ✅
C.1 Modo discreto · C.2 HMAC contactos · C.3 Verificação por níveis ·
C.4 Score explicado · **C.5 Risk score automático**

### Fase 9 — Beta & Lançamento (4 sprints) ✅
9.1 Beta fechado · **9.2 Onboarding progressivo** · **9.3 Between Guide (8 artigos)** ·
**9.4 Páginas legais (Termos, Privacidade, Cookies, Segurança)**

---

## 📋 Novidades desta sessão final

**C.5 — Risk Score automático**
- `server/src/lib/riskScore.ts` — cálculo ponderado de risco
- Fatores: reports recebidos/resolvidos (+peso), bloqueios, fotos rejeitadas, mensagens removidas
- Reduz com: verificação aprovada, antiguidade da conta
- Hooks automáticos: ao resolver report, rejeitar foto, aprovar verificação
- `POST /api/admin/users/:id/recalculate-risk`
- `POST /api/admin/risk-scores/recalculate-all` (SUPER_ADMIN)
- Admin pode ordenar utilizadores por risco (`sortByRisk=true`)

**9.2 — Onboarding progressivo**
- Perfis começam como `DRAFT`, não aparecem no discovery
- `PUT /api/profiles/onboarding/step` avança o passo (1-10)
- Ao completar step 10: DRAFT → PENDING_REVIEW (prod) ou APPROVED (dev)
- `visibleInDiscovery` só ativa após onboarding completo
- `GET /api/profiles/onboarding/steps` lista os 10 passos

**9.3 — Between Guide real**
- 8 artigos completos substituem o mockup:
  Limites em casal, Fetiches sem pressão, Segurança em encontros,
  Privacidade digital, O que é poliamor, Bom perfil, Safe Exit, Consentimento contínuo
- Vista de lista + vista de artigo completo

**9.4 — Páginas legais**
- `/legal/terms` — Termos de Utilização completos
- `/legal/privacy` — Política de Privacidade (RGPD)
- `/legal/cookies` — Política de Cookies
- `/legal/safety` — Segurança e Comunidade

---

## ⚠️ Pré-Lançamento — Itens finais antes do v1.0 real

Estes não são sprints de código — são configurações e decisões de negócio:

| Item | Ação necessária |
|---|---|
| Email SMTP (Resend) | Criar conta Resend, adicionar SMTP_HOST/PASS/EMAIL_FROM no Railway |
| Stripe live mode | Ativar conta Stripe real, substituir sk_test_ por sk_live_ |
| Revisão legal | Termos e Privacidade devem ser revistos por advogado antes do lançamento público |
| Moderação humana | Definir processo real de revisão de fotos/perfis/denúncias (atualmente fila funcional, falta equipa) |
| CONTACT_HASH_SECRET | Adicionar variável no Railway (gerada, não fallback) |
| Testes de carga | WebSockets e BD sob utilização real |
| Domínio próprio | Considerar domínio dedicado em vez de railway.app |
| App Store / Play Store | PWA evita esta dependência — decisão de manter ou expandir |

---

## 🔧 Variáveis de Ambiente — Estado Completo

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
| CONTACT_HASH_SECRET | ⚠️ a confirmar se foi adicionada |
| SMTP_HOST | ❌ pendente |
| SMTP_PASS | ❌ pendente |
| EMAIL_FROM | ❌ pendente |

---

## 📁 Estrutura Final do Projeto

```
BetweenUs/
├── client/src/
│   ├── App.jsx                       # Router completo — 20 rotas
│   ├── AppShell.jsx
│   ├── pages/ (13 páginas reais)
│   │   LoginPage, RegisterPage, CreateProfilePage, ProfilePage,
│   │   PhotosPage, CouplePage, PremiumPage, VerificationPage,
│   │   ContactsBlockPage, PrivacySettingsPage, BetaJoinPage,
│   │   LegalPage, DebugPage
│   └── screens/ (3 ecrãs)
│       ExploreScreen, MatchesScreen, GuideScreen (8 artigos reais)
│
├── server/src/
│   ├── index.ts                      # v2.2.0
│   ├── lib/
│   │   prisma.ts, redis.ts, storage.ts, riskScore.ts
│   ├── middleware/
│   │   auth.ts, admin.ts
│   └── routes/ (17 routers)
│       auth, profiles, discovery, matches, couples, photos,
│       privacy, contacts, reports, verifications, subscriptions,
│       webhooks, admin, travel, consent, safety, beta
│
└── docs/
    STATUS.md (este ficheiro), SPRINTS.md
```

---

## 🎯 Próximos passos sugeridos (fora do roadmap original)

Estas não foram pedidas mas fazem sentido para evoluir o produto:

1. Testar fluxo completo com 2+ contas reais (registo → onboarding → match → chat → safe exit)
2. Configurar Resend para emails reais
3. Recrutar pequeno grupo de beta testers via convites
4. Rever políticas legais com profissional antes de abrir ao público
5. Considerar app nativa (React Native) depois de validar PWA
