# Between Us — Workflow Original de Produto
> Documento original recebido. Fonte de verdade para decisões de produto.
> Estado de implementação actual: ver MVP_STATUS.md

---

## Princípio fundamental

"Esta aplicação não deve começar com todas as funcionalidades sexys.
Deve começar com segurança, privacidade, perfis, matching e chat.
Sem isto bem feito, o resto é maquilhagem."

---

## 1. Objectivo

Plataforma privada para adultos. Ligações entre:
- Casais que procuram terceira pessoa ou outro casal
- Pessoas solteiras que procuram casais
- Pessoas em relações abertas ou poliamorosas
- Pessoas comprometidas que procuram ligações paralelas
- Pessoas com fetiches (quadro adulto, consentido, seguro)

**Três pilares:** Privacidade · Consentimento · Compatibilidade

Não comunicar como "app para traição" — plataforma para ligações adultas, privadas e alinhadas.

---

## 2. Stack (implementada)

| Componente | Tecnologia |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite (PWA) |
| Base de dados | PostgreSQL via Prisma |
| Cache/sessões | Redis |
| Storage | Cloudflare R2 |
| Real-time | Socket.io |
| Pagamentos | Stripe |
| Email | Gmail SMTP (emailtemp02@gmail.com) |
| Deploy | Railway + GitHub Actions |
| Logs | Sentry (pendente) |
| Analytics | A definir |

---

## 3. Tipos de utilizador

**Conta** = uma pessoa real
**Perfil** = individual ou casal
**Dinâmica** = o que essa pessoa/casal procura

### Estados relacionais
SINGLE · COMMITTED · MARRIED · OPEN · POLYAMOROUS · COUPLE_CURIOUS · COUPLE_LIBERAL · OTHER

### Intenções (implementadas)
third_person · couple_to_couple · single_to_couple · open_relationship · polyamory ·
parallel_relationship · fetish_exploration · casual_encounter · conversation_only ·
trio_experience · swing · online_only · still_exploring

---

## 4. Schema de base de dados (implementado)

```
users                    — conta, auth, nif, accountName, avatarPath
profiles                 — perfil individual/casal
couple_profiles          — ligação entre dois utilizadores
profile_photos           — fotos por camadas (public/blurred/private)
intentions               — catálogo de intenções
profile_intentions       — intenções por perfil (YES/MAYBE/NO)
boundaries               — catálogo de limites
profile_boundaries       — limites por perfil
profile_actions          — like/pass/super_like/block/report
matches                  — matches activos
couple_match_approvals   — aprovação dupla para casais
conversations            — conversas (one_to_one/couple_group/private_room)
messages                 — mensagens (text/image/system/consent_request)
private_rooms            — salas privadas para grupos
private_room_members     — membros de salas privadas
privacy_settings         — visibilidade, distância, notificações
blocked_profiles         — bloqueios
blocked_contact_hashes   — HMAC de contactos (sem texto claro)
reports                  — denúncias (14 categorias)
subscriptions            — Stripe (FREE/PREMIUM)
payments                 — histórico de pagamentos
verifications            — selfie de verificação
user_consents            — registo RGPD de consentimentos
admin_actions            — audit log completo
notifications            — notificações para admin/moderadores
service_sessions         — sessões de moderação/suporte
travel_modes             — disponibilidade por cidade e data
```

---

## 5. API implementada

### Auth
```
POST /api/auth/register · login · logout · refresh
GET  /api/auth/me
POST /api/auth/email/verify · /email/confirm
POST /api/auth/password/forgot · /password/reset
PUT  /api/auth/account (nome, NIF)
POST /api/auth/avatar
GET  /api/auth/export (RGPD)
DELETE /api/auth/account
POST /api/auth/otp (emergência SUPER_ADMIN)
```

### Perfis
```
POST/GET/PUT /api/profiles
GET/PUT /api/profiles/me
PUT /api/profiles/:id/boundaries · /privacy
```

### Casais
```
POST /api/couples
POST /api/couples/:id/invite · /accept
```

### Fotos
```
POST/PUT/DELETE /api/photos/:id
POST /api/photos/:id/request-access · /grant-access
```

### Discovery
```
GET /api/discovery
POST /api/discovery/:id/like · /pass · /block · /report
```

### Matches
```
GET /api/matches
POST /api/matches/:id/approve · /end
```

### Chat (1:1)
```
GET /api/matches/:id/messages
POST /api/matches/:id/messages
```

### Private Rooms (grupos)
```
GET/POST /api/rooms
GET /api/rooms/:id · /messages
POST /api/rooms/:id/messages · /invite · /accept
DELETE /api/rooms/:id/leave
PUT /api/rooms/:id
```

### Pagamentos
```
GET /api/subscriptions/me
POST /api/subscriptions/checkout · /cancel
POST /api/webhooks/stripe
```

### Admin (completo — ver admin.ts)
```
GET/POST/PUT/DELETE /api/admin/users/:id
PUT /api/admin/users/:id/role · /status · /set-password
GET/PUT /api/admin/profiles/:id/status
GET/PUT /api/admin/photos · /reports · /conversations · /verifications
GET /api/admin/dashboard · /audit · /email-config
POST /api/admin/test-email · /service/start · /service/end
GET/DELETE /api/admin/notifications
POST/PUT/DELETE /api/admin/beta/invites
```

---

## 6. Roadmap por versões — estado actual

| Versão | Estado | Notas |
|---|---|---|
| v0.1 Protótipo | ✅ DONE | |
| v0.2 MVP técnico | ✅ DONE | |
| v0.3 Beta privado | ✅ DONE | |
| v1.0 Lançamento | 🔲 72% | Falta: email funcional, Sentry, Stripe live, landing, legal |
| v1.5 Crescimento | 🔲 40% | Travel Mode ✅, Private Rooms ✅, Private Room avançado pendente |
| v2.0 App mobile | 🔲 5% | PWA com ícone ✅, app nativa pendente |

---

## 7. Sprints completos

| Sprint | Objectivo | Estado |
|---|---|---|
| 1 | Fundação: auth, CI/CD, BD | ✅ |
| 2 | Perfis: individual, casal, intenções, fotos | ✅ |
| 3 | Discovery: filtros, feed, algoritmo | ✅ |
| 4 | Matching: reciprocidade, double consent | ✅ |
| 5 | Chat: conversas, mensagens, denúncias | ✅ |
| 6 | Privacidade: moderação, admin completo | ✅ |
| 7 | Pagamentos: Stripe, subscrições | ✅ |
| 8 | Beta: convites, testes, onboarding | ✅ |

---

## 8. Ordem de implementação seguida (correcta)

1. ✅ Autenticação
2. ✅ Perfis individuais e de casal
3. ✅ Intenções e limites
4. ✅ Fotos por camadas
5. ✅ Discovery com algoritmo
6. ✅ Likes / matches / double consent
7. ✅ Chat 1:1
8. ✅ Denúncias / bloqueios
9. ✅ Painel admin completo
10. ✅ Premium (Stripe)
11. ✅ Modo invisível
12. ✅ Bloqueio de contactos (HMAC)
13. ✅ Travel Mode
14. ✅ Private Rooms (grupos: trio, swing, casal+casal)
15. ✅ PWA + ícone iOS
16. 🔲 Email funcional (Gmail App Password pendente)
17. 🔲 Eventos privados
18. 🔲 App mobile nativa

---

## 9. Backlog pendente (v1.0)

| Item | Prioridade |
|---|---|
| Configurar Gmail App Password no Railway (SMTP_PASS) | 🔴 Crítico |
| Revisão jurídica dos documentos legais | 🔴 Crítico |
| Sentry para erros em produção | 🟡 Alto |
| Stripe live (conta real) | 🟡 Alto |
| Landing page pública | 🟡 Alto |
| Hard delete job (30 dias) | 🟡 Alto |
| Signed URLs para fotos privadas (R2) | 🟠 Médio |
| Notificações push (PWA) | 🟠 Médio |
| Between Guide (artigos educativos) | 🟠 Médio |

---

## 10. Regras de segurança (não negociáveis)

- Proibir menores de idade (verificação + selfie)
- Não mostrar localização exacta (coordenadas arredondadas)
- Não guardar contactos em texto claro (HMAC-SHA256)
- Não enviar notificações com conteúdo explícito
- Não mostrar perfis a contactos bloqueados
- Não mostrar perfis admin no discovery
- Permitir apagar conta e dados (RGPD)
- Moderar fotos antes de publicar
- Registar todos os consentimentos com IP + timestamp
- Rate limiting em todos os endpoints de auth
- Audit log completo de todas as acções admin

---

## 11. Fora do MVP (não implementar antes de v1.0 estável)

- Videochamada
- IA para sugestões
- App nativa iOS/Android
- Feed social / stories
- Gamificação
- Comunidades / grupos públicos
- Verificação documental pesada
- Matching ultra-avançado

---

## 12. Arquitectura actual

```
Frontend PWA (React + Vite)  ←→  Backend (Node.js + Express + TypeScript)
                                          |
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                         PostgreSQL     Redis    Cloudflare R2
                              |
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                 Stripe    Gmail     Sentry
                          SMTP     (pendente)
```
