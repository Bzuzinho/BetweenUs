# Between Us — Workflow Completo de Produto
> Documento original de visão de produto. Referência definitiva.
> Estado actual de implementação em: docs/product/MVP_STATUS.md

---

## 1. Objectivo

Plataforma privada para adultos. Ligações entre:
- Casais que procuram terceira pessoa ou outro casal
- Pessoas solteiras que procuram casais
- Pessoas em relações abertas ou poliamorosas
- Pessoas comprometidas que procuram ligações paralelas
- Pessoas com fetiches ou interesses específicos (quadro adulto, consentido, seguro)

**Três pilares:** Privacidade · Consentimento · Compatibilidade

Não comunicar como "app para traição" — comunicar como plataforma para ligações adultas, privadas e alinhadas.

---

## 2. Stack (implementada)

| Componente | Tecnologia |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite (PWA) |
| Base de dados | PostgreSQL via Prisma |
| Cache/sessões | Redis |
| Storage | Cloudflare R2 |
| Auth | Email + password |
| Pagamentos | Stripe |
| Real-time | Socket.io |
| Deploy | Railway (auto-deploy via GitHub) |
| Email | Resend HTTP API |
| Logs | Sentry (pendente) |
| Analytics | A definir |

---

## 3. Tipos de utilizador

### Conta
Uma conta = uma pessoa real.

### Perfil
Pode ser individual ou de casal.

### Estados relacionais
SINGLE · COMMITTED · MARRIED · OPEN · POLYAMOROUS · COUPLE_CURIOUS · COUPLE_LIBERAL · OTHER

### Intenções
- Procurar terceira pessoa (seek_third)
- Procurar casal (seek_couple)
- Procurar solteiro/a
- Conversa discreta (conversation_only)
- Experiência pontual (casual_encounter)
- Relação paralela contínua (recurring_connection)
- Amizade colorida (friends_with_benefits)
- Poliamor (polyamory)
- Explorar fetiches (fetish_exploration)
- Swing (swing)
- Experiência a três (trio_experience)
- Apenas online (online_only)
- Ainda a descobrir (still_exploring)

---

## 4. Schema de base de dados

### Tabelas implementadas
```
users                    — conta, auth, consentimentos, nif, accountName, avatarPath
profiles                 — perfil individual/casal, intenções, limites, discrição
couple_profiles          — ligação entre dois utilizadores
profile_photos           — fotos com níveis de visibilidade (public/blurred/private)
intentions               — catálogo de intenções
profile_intentions       — intenções por perfil (with preference YES/MAYBE/NO)
boundaries               — catálogo de limites
profile_boundaries       — limites por perfil
profile_actions          — like/pass/super_like/block/report
matches                  — matches activos
couple_match_approvals   — aprovação dupla para casais
conversations            — conversas entre matches
conversation_members     — participantes
messages                 — mensagens (text/image/system/consent_request)
privacy_settings         — visibilidade, distância, notificações, invisível
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
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/email/verify       — reenvio de link de verificação
POST   /api/auth/email/confirm      — confirmar token do link
POST   /api/auth/password/forgot
POST   /api/auth/password/reset
PUT    /api/auth/account            — nome, NIF (campos de conta)
POST   /api/auth/avatar             — foto de conta
GET    /api/auth/export             — exportação RGPD
DELETE /api/auth/account            — eliminação de conta
DELETE /api/auth/sessions           — revogar todas as sessões
POST   /api/auth/otp                — gerar link de login de emergência (SUPER_ADMIN)
GET    /api/auth/otp-login          — login com token OTP
```

### Perfis
```
POST   /api/profiles
GET    /api/profiles/me
PUT    /api/profiles/me
GET    /api/profiles/:id
PUT    /api/profiles/:id
PUT    /api/profiles/:id/boundaries
PUT    /api/profiles/:id/privacy
```

### Casais
```
POST   /api/couples
POST   /api/couples/:id/invite
POST   /api/couples/:id/accept
PUT    /api/couples/:id
```

### Fotos
```
POST   /api/photos
PUT    /api/photos/:id
DELETE /api/photos/:id
POST   /api/photos/:id/request-access
POST   /api/photos/:id/grant-access
```

### Discovery
```
GET    /api/discovery
POST   /api/discovery/:id/like
POST   /api/discovery/:id/pass
POST   /api/discovery/:id/block
POST   /api/discovery/:id/report
```

### Matches
```
GET    /api/matches
GET    /api/matches/:id
POST   /api/matches/:id/approve
POST   /api/matches/:id/end
```

### Chat
```
GET    /api/conversations
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages
DELETE /api/conversations/:id
```

### Pagamentos
```
GET    /api/subscriptions/me
POST   /api/subscriptions/checkout
POST   /api/subscriptions/cancel
POST   /api/webhooks/stripe
```

### Privacidade
```
GET    /api/privacy
PUT    /api/privacy
POST   /api/contacts/import
```

### Verificações
```
GET    /api/verifications/me
POST   /api/verifications/submit
POST   /api/verifications/email/request
POST   /api/verifications/email/confirm
```

### Admin
```
GET    /api/admin/dashboard
GET    /api/admin/users
POST   /api/admin/users              — criar utilizador directamente
PUT    /api/admin/users/:id
PUT    /api/admin/users/:id/role     — SUPER_ADMIN only
PUT    /api/admin/users/:id/status
DELETE /api/admin/users/:id
POST   /api/admin/users/:id/reset-password
POST   /api/admin/users/:id/set-password  — SUPER_ADMIN emergency
GET    /api/admin/profiles
PUT    /api/admin/profiles/:id/status
GET    /api/admin/photos
PUT    /api/admin/photos/:id
GET    /api/admin/reports
PUT    /api/admin/reports/:id
GET    /api/admin/conversations
GET    /api/admin/conversations/:id
GET    /api/admin/audit
GET    /api/admin/verifications
PUT    /api/admin/verifications/:userId
GET    /api/admin/notifications
PUT    /api/admin/notifications/:id/read
DELETE /api/admin/notifications/:id
DELETE /api/admin/notifications
POST   /api/admin/service/start
POST   /api/admin/service/end
GET    /api/admin/service/status
GET    /api/admin/service/sessions
POST   /api/admin/beta/invites
PUT    /api/admin/beta/invites/:id/toggle
GET    /api/admin/email-config       — diagnóstico SMTP
POST   /api/admin/test-email         — enviar email de teste
```

---

## 6. Roadmap por versões — estado actual

| Versão | Estado | Descrição |
|---|---|---|
| v0.1 Protótipo | ✅ DONE | Interface, dados de teste, mockups |
| v0.2 MVP técnico | ✅ DONE | BD real, perfis, matching, chat, admin |
| v0.3 Beta privado | ✅ DONE | Convites, moderação, fotos, denúncias, premium |
| v1.0 Lançamento | 🔲 70% | PWA pública, Stripe live, legal, landing page |
| v1.5 Crescimento | 🔲 35% | Travel Mode (feito), Private Room avançado |
| v2.0 App mobile | 🔲 0% | iOS, Android, push, Face ID |

---

## 7. Sprints concluídos

| Sprint | Objectivo | Estado |
|---|---|---|
| 1 | Fundação: auth, CI/CD, base de dados | ✅ |
| 2 | Perfis: individual, casal, intenções, fotos | ✅ |
| 3 | Discovery: filtros, feed, likes, algoritmo | ✅ |
| 4 | Matching: reciprocidade, double consent | ✅ |
| 5 | Chat: conversas, mensagens, denúncias | ✅ |
| 6 | Privacidade e segurança: moderação, admin | ✅ |
| 7 | Pagamentos: Stripe, subscrições, webhooks | ✅ |
| 8 | Beta fechado: convites, testes, onboarding | ✅ |

---

## 8. Backlog ordenado

### Alta prioridade (v1.0)
- [ ] Verificar domínio no Resend (email para qualquer destinatário)
- [ ] Revisão jurídica dos documentos legais
- [ ] Sentry para monitorização de erros
- [ ] Stripe live (conta real, não teste)
- [ ] Landing page pública
- [ ] Hard delete job (contas DELETED há +30 dias)
- [ ] Signed URLs para fotos privadas (R2)

### Média prioridade (v1.5)
- [ ] Private Room avançado (sala para 3+)
- [ ] Mensagens temporárias com expiração
- [ ] Fotos temporárias
- [ ] Verificação de identidade automática
- [ ] Notificações push (PWA)
- [ ] Between Guide (artigos educativos)
- [ ] Eventos privados

### Baixa prioridade (v2.0+)
- [ ] Videochamada
- [ ] IA para sugestões de conversa
- [ ] App iOS nativa
- [ ] App Android nativa
- [ ] Feed social / comunidades
- [ ] Gamificação

---

## 9. Regras críticas de segurança (não negociáveis)

- Proibir menores de idade (verificação no registo + selfie)
- Não mostrar localização exacta (coordenadas arredondadas)
- Não guardar contactos em texto claro (HMAC-SHA256)
- Não enviar notificações com conteúdo explícito
- Não mostrar perfis a contactos bloqueados
- Permitir apagar conta e todos os dados (RGPD)
- Moderar fotos antes de publicar
- Registar todos os consentimentos com timestamp e IP
- Rate limiting em todos os endpoints de auth
- Audit log completo de todas as acções admin
- Perfis admin excluídos do discovery

---

## 10. Decisão de email — estado actual

**Situação:** Resend configurado mas `onboarding@resend.dev` só envia para o email da conta Resend.

**Para resolver (por ordem):**
1. **Imediato:** Testar envio para `emailtemp02@gmail.com` (email da conta Resend) — deve funcionar já
2. **Definitivo:** Verificar domínio em resend.com/domains → mudar EMAIL_FROM para `noreply@dominio.com`

**Nota:** Sem domínio próprio ainda. A usar `emailtemp02@gmail.com` como conta Resend.
