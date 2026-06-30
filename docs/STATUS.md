# Between Us — Estado de Desenvolvimento
> Documento vivo. Atualizado a cada sprint/auditoria.
> Última atualização: Jun 29, 2026 — Auditoria de segurança e coerência (pontos 1-21)

---

## 🔍 Auditoria técnica completa (21 pontos) — estado

Esta sessão não acrescentou funcionalidades novas. Corrigiu incoerências,
falhas de segurança e desalinhamentos entre frontend/backend identificados
numa revisão técnica completa, antes de qualquer beta com utilizadores reais.

| # | Item | Estado | Notas |
|---|---|---|---|
| 1 | `/admin` registado e protegido por `adminRole` | ✅ | `AdminRoute` dedicada em App.jsx |
| 2 | `/debug` removido de produção | ✅ | Só existe atrás de `import.meta.env.DEV` |
| 3 | AdminPage alinhada com `/api/admin/...` | ✅ | Reescrita completa — endpoints antigos `/beta/invites`, `/beta/stats` removidos |
| 4 | Beta fechado validado no `/api/auth/register` | ✅ | `validateBetaCode()` dentro do register; consumo atómico após criação da conta |
| 5 | `/api/beta/use/:code` descontinuado | ✅ | Retorna `410 Gone`; `/validate` mantém-se público |
| 6 | Tokens migrados para cookies `httpOnly` | ✅ | `Secure` em prod, `SameSite=Lax`; localStorage mantido como fallback transitório |
| 7 | Autorização em ConsentCheck por membership | ✅ | `verifyMatchMembership()` aplicado em create/respond/list |
| 8 | Autorização em Double Consent de casais | ✅ | Valida `partnerOneUserId`/`partnerTwoUserId` do casal ACTIVE envolvido |
| 9 | Like normal unificado com lógica de casal | ✅ | `matchService.ts` — `createLikeOrMatch()` usado por discovery E couples |
| 10 | Moderação admin de conversas | ✅ | `GET/PUT /api/admin/conversations`, motivo obrigatório, AdminAction sempre |
| 11 | UI admin completa (9 tabs reais) | ✅ | Dashboard, Reports, Fotos, Perfis, Utilizadores, Verificações, Conversas, Auditoria, Beta |
| 12 | Pedido real de acesso a fotos privadas | ✅ | Modelo `PhotoAccessRequest`, exige match ativo, aprovação/revogação |
| 13 | Pipeline real de imagens (EXIF, resize, blur) | ✅ | `imageProcessing.ts` com `sharp` — `exifStripped` só true após reprocessamento real |
| 14 | Fallback inseguro de `CONTACT_HASH_SECRET` removido em prod | ✅ | Lança erro se `NODE_ENV=production` e variável ausente |
| 15 | `requireAuth` carrega `adminRole`/`emailVerifiedAt`, bloqueia SUSPENDED | ✅ | Middleware único, evita múltiplas queries |
| 16 | Admin não precisa de perfil | ✅ | `PrivateRoute`/`RootRedirect` tratam `user.adminRole` como caso especial |
| 17 | Fluxo beta invite → registo coerente | ✅ | `BetaJoinPage` valida e guarda código; `RegisterPage` usa endpoint real; consumo só no register |
| 18 | Reports críticos com prioridade automática | ✅ | MINOR/THREAT/NON_CONSENSUAL_IMAGE/HARASSMENT → priority 10; reincidência → priority 8 |
| 19 | Testes automatizados mínimos | 🔲 | **Pendente** — ver secção abaixo |
| 20 | Checklist pré-beta | 🟡 | Ver tabela "Checklist Final" abaixo |
| 21 | Execução por prioridade | ✅ | Seguida pela ordem indicada no documento de auditoria |

---

## ⚠️ Ponto 19 — Testes automatizados (PENDENTE)

Ainda não implementado nesta sessão. Lista de testes mínimos a criar:

**Auth:** registo sem betaCode falha com BETA_CLOSED=true · registo com betaCode válido funciona · betaCode expirado falha · refresh só funciona com hash Redis correspondente · logout revoga refresh token

**Admin:** utilizador normal não acede a `/api/admin/dashboard` · admin acede · moderator não acede a subscrições · finance não acede a reports · toda ação admin cria AdminAction

**Matches/Chats:** não-membro não lê mensagens · não-membro não envia · match BLOCKED impede envio

**Consent:** não-membro não cria/responde consent check · consent check expirado não pode ser aceite

**Fotos:** PENDING em produção · PENDING não aparece no discovery · pedido de foto privada exige match ativo · foto rejeitada aumenta risk score

**Discovery:** admin não aparece · PENDING_REVIEW não aparece · INVISIBLE não aparece · fotos não aprovadas não aparecem

*Nota: requer configurar Jest/Vitest + ambiente de teste com BD isolada — não foi feito nesta sessão por não estar incluído no pedido original de correções.*

---

## ✅ Checklist Final (ponto 20)

```
[✅] /debug removido ou protegido
[✅] /admin acessível e protegido
[✅] AdminPage usa endpoints corretos
[✅] Beta fechado bloqueia registo sem convite
[✅] Tokens fora de localStorage (cookies httpOnly primários)
[✅] CORS restrito em produção
[✅] CONTACT_HASH_SECRET obrigatório em produção
[✅] ConsentCheck validado por membership
[✅] Double Consent validado por membership
[✅] Like normal não contorna casal
[✅] Fotos PENDING em produção
[✅] EXIF removido realmente (pipeline sharp)
[✅] Pedido de fotos privadas implementado
[✅] Admin consegue moderar reports
[✅] Admin consegue moderar fotos
[✅] Admin consegue validar perfis
[✅] Admin consegue auditar ações
[✅] Admin consegue consultar conversas com motivo auditado
[🔲] Testes mínimos criados
```

**17 de 18 itens fechados.** Falta apenas a suite de testes automatizados.

---

## 🚀 Produção

| Serviço | URL | Estado |
|---|---|---|
| Frontend | https://betweenus-production.up.railway.app | ✅ Online |
| Backend API | https://fearless-stillness-production-e5f6.up.railway.app | ✅ v2.3.0 |
| PostgreSQL | Railway internal | ✅ Online |
| Redis | Railway internal | ✅ Online |
| Storage | Cloudflare R2 (betweenus) | ✅ Configurado |
| Pagamentos | Stripe (modo teste) | ✅ Configurado |
| Email | Resend | ❌ SMTP por configurar |

---

## 🔧 Variáveis de Ambiente — incluindo novas desta auditoria

| Variável | Estado | Notas |
|---|---|---|
| DATABASE_URL | ✅ | |
| REDIS_URL | ✅ | |
| JWT_SECRET | ✅ | |
| JWT_REFRESH_SECRET | ✅ | |
| CLIENT_URL | ✅ | |
| NODE_ENV | ✅ | |
| ADMIN_EMAILS | ✅ | Fallback se `adminRole` não estiver na BD |
| STORAGE_ENDPOINT | ✅ R2 | |
| STORAGE_ACCESS_KEY | ✅ R2 | |
| STORAGE_SECRET_KEY | ✅ R2 | |
| STORAGE_BUCKET | ✅ R2 | |
| STORAGE_PUBLIC_URL | ✅ R2 | |
| STRIPE_SECRET_KEY | ✅ test | |
| STRIPE_WEBHOOK_SECRET | ✅ test | |
| STRIPE_PRICE_PREMIUM | ✅ test | |
| STRIPE_PRICE_COUPLE | ✅ test | |
| **CONTACT_HASH_SECRET** | ⚠️ **confirmar** | Agora obrigatório em produção — app falha sem ela |
| **BETA_CLOSED** | 🆕 **novo** | `true` para exigir convite no registo; `false`/ausente = registo aberto |
| SMTP_HOST | ❌ pendente | |
| SMTP_PASS | ❌ pendente | |
| EMAIL_FROM | ❌ pendente | |

⚠️ **Ação necessária no Railway:** confirmar `CONTACT_HASH_SECRET` está definida (a app agora rejeita arrancar em produção sem ela ao usar discovery). Definir `BETA_CLOSED=true` quando quiseres ativar o beta fechado.

---

## 📁 Novos ficheiros desta auditoria

```
server/src/lib/
  matchService.ts        # Point 9 — single source of truth para like→match
  imageProcessing.ts      # Point 13 — pipeline real sharp (EXIF, resize, blur)
  riskScore.ts            # (sessão anterior)

server/prisma/schema.prisma
  + PhotoAccessRequest model
  + PhotoAccessStatus enum

client/src/pages/
  AdminPage.jsx            # Reescrita completa — 9 tabs reais
```

---

## 📋 Próximos passos sugeridos

1. **Ponto 19** — implementar suite de testes mínimos (Jest/Vitest + BD de teste)
2. Confirmar `CONTACT_HASH_SECRET` no Railway antes do próximo deploy
3. Testar fluxo completo de beta fechado: criar convite no admin → copiar link → registar com código
4. Testar fluxo de double consent de casal ponta a ponta com 2 contas + 1 terceira
5. Validar visualmente o pipeline de imagens (upload → blur real visível)
6. Configurar Resend para emails reais
