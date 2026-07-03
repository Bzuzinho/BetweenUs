# Between Us — Estado Real do MVP
> Última actualização: Julho 2026 — Sprint 2 (rev. 6)
> ⚠️ Documento interno. A documentação segue o código — se divergem, a documentação está errada.

---

## Posição no roadmap

| Versão | Estado | Notas |
|---|---|---|
| v0.1 Protótipo | ✅ DONE | |
| v0.2 MVP técnico | ✅ DONE | |
| v0.3 Beta privado | ✅ 100% | Todos os bloqueadores técnicos resolvidos |
| v1.0 Lançamento | 🔲 70% | Landing, Sentry, Stripe live, revisão legal |
| v1.5 Crescimento | 🔲 35% | Travel Mode feito; Private Room avançado |
| v2.0 App mobile | 🔲 0% | PWA activa em substituição |

---

## Sprint 2 — concluído

### Problemas resolvidos neste sprint

| Item | Estado |
|---|---|
| Email verification ficava a "enviar" infinitamente | ✅ Corrigido — todos os envios de email são async/non-blocking |
| Admin vai para /explore em vez de /admin | ✅ Corrigido — LoginPage navega baseado em adminRole |
| Botão "Editar perfil" ia para /create-profile | ✅ Corrigido — /edit-profile + EditProfilePage + PUT /profiles/me |
| Admin não ocupava ecrã completo no desktop | ✅ Corrigido — removido maxWidth |
| Cabeçalho admin com ordem errada | ✅ Corrigido — logo | Between Us | [espaço] | avatar+nome+role | sino |
| Separadores do admin ilegíveis | ✅ Corrigido — 14px, cor #C8D4DC |
| "Editar" em vez de "Guardar" | ✅ Corrigido — botões chamam-se "Guardar" |
| Sem separação Conta / Perfil | ✅ Implementado — /account (AccountPage) + /edit-profile (EditProfilePage) |
| ProfilePage sem link para /account | ✅ Corrigido |
| Admin sem tab Configurações | ✅ Implementado — Configurações com subtabs Perfis + Subscrições |
| Dados de perfil incompletos no admin | ✅ Corrigido — UserDetail mostra todos os campos |
| Avatar no cabeçalho do admin | ✅ Implementado — mostra foto real se existir |

---

## Arquitectura Conta vs Perfil

### Conta (`/account`)
Dados privados do utilizador — não visíveis ao público:
- Email (imutável pelo utilizador)
- Nome real (`accountName`)
- NIF (`nif`)
- Imagem de conta (`avatarPath`) — usada no admin/settings
- Subscrição (plano, estado, data de renovação)
- Role (tipo de conta)
- Password (alterável via forgot-password)

### Perfil (`/edit-profile`)
Dados públicos — visíveis a outros utilizadores:
- Nome visível / pseudónimo (`displayName`)
- Bio
- Cidade (absorve georeferenciação)
- Estado do perfil (APPROVED, PENDING_REVIEW, etc.)
- Estado relacional (SINGLE, MARRIED, OPEN, etc.)
- Nível de discrição (MAXIMUM, SELECTIVE, OPEN)
- O que procura (intenções)
- Fotos (com tipo de visualização)
- Privacidade
- Verificação de perfil
- Perfil de casal
- Bloqueio de contactos
- Between Plus

---

## Módulos — estado actual

| Módulo | Estado | Notas |
|---|---|---|
| Auth | ✅ | Registo, login, refresh, logout, rate limit |
| Email verification | ✅ | Async non-blocking; Resend SMTP |
| Password reset | ✅ | forgot + reset via email |
| Age verification | ✅ | ≥18; ageVerifiedAt preenchido após selfie |
| Conta (AccountPage) | ✅ | Nome, email, NIF, avatar, subscrição, role |
| Perfil (EditProfilePage) | ✅ | displayName, bio, cidade, intenções, discrição |
| Perfis de casal | ✅ | Double Consent, separação por perfil |
| Discovery | ✅ | Between Score, filtros, admin profiles excluídos |
| Matching | ✅ | Individual + couple, PENDING_COUPLE_APPROVAL |
| Chat | ✅ | Tempo real Socket.io |
| Reports | ✅ | 14 categorias, prioridade auto |
| Admin panel | ✅ | Header correcto, tabs compactas, RBAC 6 roles |
| Admin Configurações | ✅ | Subtabs Perfis + Subscrições (SUPER_ADMIN only) |
| Service sessions | ✅ | Moderador/Suporte entra/sai ao serviço |
| Notificações admin | ✅ | Bell com badge, CRUD, auto-reload 30s |
| Gestão de roles | ✅ | SUPER_ADMIN cria utilizadores e atribui roles |
| Photos | ✅ | Upload, EXIF strip, blur, moderação |
| Privacy settings | ✅ | Invisível (Premium gate), distância, notificações |
| Travel mode | ✅ | Activar/desactivar, múltiplos destinos |
| Subscriptions | ✅ | Stripe checkout, cancel |
| GDPR export/delete | ✅ | Export JSON, soft-delete |
| Design v3 | ✅ | Option 3 palette em todas as páginas |
| Legal docs | 🟡 | Templates criados — falta revisão jurídica |
| Monitoring | ❌ | Sentry — antes de v1.0 |
| Landing page | ❌ | Necessário para v1.0 |
| Hard delete job | ❌ | Soft-delete existe; job 30 dias por fazer |

---

## Bloqueadores actuais

| # | Bloqueador | Acção |
|---|---|---|
| 1 | Revisão legal dos documentos | Advogado antes de lançamento público |
| 2 | Sentry | Configurar antes de v1.0 |
| 3 | Stripe live | Activar conta real antes de v1.0 |
| 4 | Landing page | Criar antes de v1.0 |

**Nota:** o SUPER_ADMIN pode agir como moderador. Não há bloqueador técnico para beta privado.
