# Between Us — Workflow de Programação
> Documento de referência do produto. Versão original recebida em Julho 2026.
> Este documento define a visão, arquitectura e roadmap do produto.

---

## 1. Objectivo do produto

Plataforma privada para adultos. Ligações entre:
- Casais que procuram terceira pessoa ou outro casal
- Pessoas solteiras interessadas em casais
- Pessoas em relações abertas, poliamorosas ou comprometidas
- Pessoas com interesses específicos dentro de um quadro consentido e seguro

**Três pilares da marca:** Privacidade · Consentimento · Compatibilidade

Posicionamento: plataforma para ligações adultas, privadas e alinhadas.
NÃO comunicar como "app para traição".

---

## 2. Decisões iniciais (fechadas)

| Decisão | Escolha actual |
|---|---|
| Plataforma | Web app responsiva + PWA |
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite |
| Base de dados | PostgreSQL via Prisma |
| Cache/filas | Redis |
| Storage | Cloudflare R2 |
| Autenticação | Email + password |
| Pagamentos | Stripe |
| Mensagens real-time | Socket.io |
| Deploy | Railway (auto-deploy via GitHub) |
| Logs/erros | Sentry (pendente) |
| Analytics | A definir |

---

## 3. Arquitectura

```
Frontend Web/PWA (React + Vite)
        |
        v
API Backend (Node.js + Express + TypeScript)
        |
        +--> PostgreSQL (via Prisma ORM)
        |
        +--> Redis (sessões, tokens, filas)
        |
        +--> Cloudflare R2 (fotos)
        |
        +--> Stripe (pagamentos)
        |
        +--> Resend/SMTP (emails transacionais)
        |
        +--> Sentry (erros — pendente)
```

---

## 4. Tipos de utilizador e perfil

### Conta
Uma conta = uma pessoa real.

### Perfil
Um perfil pode ser individual ou de casal.

### Tipos de perfil
- Individual
- Casal
- Grupo (fase futura)

### Estados relacionais
SINGLE · COMMITTED · MARRIED · OPEN · POLYAMOROUS · COUPLE_CURIOUS · COUPLE_LIBERAL · OTHER

### Intenções
- Procurar terceira pessoa
- Procurar casal
- Procurar solteiro/a
- Conversa discreta
- Experiência pontual
- Relação paralela contínua
- Amizade colorida
- Poliamor
- Explorar fetiches
- Ainda a descobrir

---

## 5. Schema de base de dados (referência)

### Tabelas principais

```
users                    — conta, auth, consentimentos
profiles                 — perfil individual ou base de casal
couple_profiles          — ligação entre dois utilizadores num casal
profile_photos           — fotos com níveis de visibilidade
intentions               — catálogo de intenções
profile_intentions       — intenções por perfil
boundaries               — catálogo de limites
profile_boundaries       — limites por perfil (yes/maybe/no)
profile_actions          — like/pass/super_like/block/report
matches                  — matches activos entre perfis
couple_match_approvals   — aprovação dupla para casais
conversations            — conversas entre matches
conversation_members     — participantes de cada conversa
messages                 — mensagens individuais
privacy_settings         — definições de privacidade por perfil
blocked_profiles         — bloqueios entre utilizadores
blocked_contact_hashes   — HMAC de contactos para exclusão
reports                  — denúncias
subscriptions            — subscrições Stripe
payments                 — histórico de pagamentos
verifications            — verificação de identidade/selfie
user_consents            — registo de consentimentos RGPD
admin_actions            — audit log de acções admin
notifications            — notificações para admins/moderadores
service_sessions         — sessões de serviço (moderador/suporte)
travel_modes             — disponibilidade por cidade e data
```

---

## 6. API principal

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/email/verify
POST   /api/auth/email/confirm
POST   /api/auth/password/forgot
POST   /api/auth/password/reset
PUT    /api/auth/account         (nome, NIF)
POST   /api/auth/avatar          (foto de conta)
GET    /api/auth/export          (RGPD)
DELETE /api/auth/account         (eliminação)
```

### Perfis
```
POST   /api/profiles
GET    /api/profiles/me
PUT    /api/profiles/me
GET    /api/profiles/:id
PUT    /api/profiles/:id
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

### Admin
```
GET    /api/admin/dashboard
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
PUT    /api/admin/users/:id/role
PUT    /api/admin/users/:id/status
DELETE /api/admin/users/:id
GET    /api/admin/profiles
PUT    /api/admin/profiles/:id/status
GET    /api/admin/photos
PUT    /api/admin/photos/:id
GET    /api/admin/reports
PUT    /api/admin/reports/:id
GET    /api/admin/audit
GET    /api/admin/notifications
DELETE /api/admin/notifications/:id
POST   /api/admin/service/start
POST   /api/admin/service/end
GET    /api/admin/service/status
GET    /api/admin/service/sessions
POST   /api/admin/beta/invites
PUT    /api/admin/beta/invites/:id/toggle
```

---

## 7. Roadmap por versões

| Versão | Estado | Descrição |
|---|---|---|
| v0.1 Protótipo | ✅ DONE | Login, perfil, discovery falso, mockups |
| v0.2 MVP técnico | ✅ DONE | BD real, perfis reais, matching, chat básico, admin mínimo |
| v0.3 Beta privado | ✅ DONE | Convites, moderação, fotos privadas, denúncias, premium básico |
| v1.0 Lançamento | 🔲 70% | PWA pública, Stripe live, modo invisível, painel admin completo, políticas legais |
| v1.5 Crescimento | 🔲 35% | Travel Mode (feito), Private Room avançado, eventos privados, verificação melhorada |
| v2.0 App mobile | 🔲 0% | iOS, Android, push notifications, Face ID/PIN, ícone discreto |

---

## 8. Backlog ordenado

### Prioridade alta (v1.0)
- [ ] Revisão jurídica dos documentos legais
- [ ] Sentry para monitorização de erros
- [ ] Stripe live (conta real)
- [ ] Landing page pública
- [ ] Hard delete job (contas DELETED há +30 dias)
- [ ] Signed URLs para fotos privadas
- [ ] Testes de integração (email, Stripe webhook)

### Prioridade média (v1.5)
- [ ] Private Room avançado (sala para 3+ pessoas)
- [ ] Mensagens temporárias
- [ ] Fotos temporárias com expiração
- [ ] Verificação de identidade melhorada (selfie automática)
- [ ] Notificações push (PWA)
- [ ] Between Guide (artigos educativos)
- [ ] Eventos privados

### Prioridade baixa (v2.0+)
- [ ] Videochamada
- [ ] IA para sugestões de conversa
- [ ] App iOS nativa
- [ ] App Android nativa
- [ ] Feed social / comunidades
- [ ] Gamificação

---

## 9. Sprints concluídos

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

## 10. Regras críticas de segurança (não negociáveis)

- Proibir menores de idade (validação no registo + selfie)
- Não mostrar localização exacta
- Não guardar contactos em texto claro (HMAC)
- Não enviar notificações com conteúdo explícito
- Não mostrar perfis a contactos bloqueados
- Permitir apagar conta e todos os dados (RGPD)
- Moderar fotos antes de publicar
- Registar todos os consentimentos com timestamp e IP
- Rate limiting em todos os endpoints de auth
- Audit log completo de todas as acções admin

---

## 11. Funcionalidades fora do MVP (confirmado)

Não implementar antes do v1.0 estar estável:
- Videochamada
- Eventos privados
- IA para sugestões
- App nativa iOS/Android
- Geolocalização em tempo real
- Conteúdo explícito
- Comunidades/grupos
- Verificação documental pesada
- Feed social
- Stories/histórias
- Gamificação
