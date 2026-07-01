# Between Us — Auditoria do Estado Actual
> Data: Julho 2026 | Auditor: revisão técnica interna
> ⚠️ Este documento é para uso interno. Não substitui aconselhamento jurídico profissional.

---

## 1. O que já está implementado

### Backend / Infra
- Node.js + Express + TypeScript + ts-node em produção (Railway)
- Prisma ORM + PostgreSQL (Railway volume persistente)
- Redis para refresh tokens (hash SHA-256)
- Socket.io para chat em tempo real
- Cloudflare R2 para armazenamento de ficheiros
- Stripe preparado (modo teste activo)
- GitHub Actions CI com testes automatizados

### Autenticação
- Registo com validação de idade (≥18 por data de nascimento)
- Login com bcrypt (cost 12)
- JWT access token (15 min) + refresh token (30 dias)
- Cookies httpOnly + Secure + SameSite=Lax
- Redis hash para refresh tokens (rotação real)
- Rate limiting em /auth/login e /auth/register (10/15min)
- Beta fechado via BETA_CLOSED env var
- Validação e consumo de convite beta no register (single source of truth)

### Perfis
- Perfis individuais e de casal (INDIVIDUAL / COUPLE)
- Status: DRAFT → PENDING_REVIEW → APPROVED / REJECTED
- Intenções com preferência YES/MAYBE/NO
- Boundaries com preferência
- Modos de discrição (MAXIMUM / SELECTIVE / OPEN)
- Onboarding progressivo (10 passos, DRAFT até completar)

### Discovery
- Feed com Between Score (compatibilidade ponderada)
- Admins excluídos do feed
- Perfis PENDING_REVIEW excluídos
- Perfis INVISIBLE excluídos
- Bloqueio de contactos por HMAC (exclui mutuamente)
- Badges de verificação no card

### Matches e Chat
- Like/Match unificado em matchService.ts (single source of truth)
- Double Consent para casais (ambos os parceiros aprovam)
- Match PENDING_COUPLE_APPROVAL para casais
- Chat em tempo real (Socket.io)
- Autorização por membership (não-membros bloqueados)
- Mensagens com soft-delete (deletedAt)
- Acordo antes do chat (modal de 5 perguntas)
- Safe Exit com 6 opções

### Privacidade
- Modo Invisível (Premium)
- Ocultar distância
- Modo de notificações (NORMAL / DISCREET / SILENT)
- Bloqueio de contactos (HMAC-SHA256)
- Travel Mode
- Soft Reveal (4 níveis de visibilidade de foto)

### Fotos
- Upload com validação de magic bytes reais
- Pipeline sharp: EXIF strip, resize (1600px), compressão (85%), blur real (sigma 25)
- Versão blurred gerada e armazenada separadamente
- PENDING em produção (moderação antes de visibilidade)
- Pedido de acesso a fotos privadas (PhotoAccessRequest)
- Revogação de acesso
- Máximo 6 fotos por perfil

### Reports e Moderação
- ReportReason: FAKE_PROFILE, HARASSMENT, OFFENSIVE_CONTENT, MINOR, NON_CONSENSUAL_IMAGE, SPAM, THREAT, OTHER
- Prioridade automática: MINOR/THREAT/NON_CONSENSUAL_IMAGE/HARASSMENT → 10
- Reincidência detectada (≥2 reports pendentes → priority 8)
- Admin pode resolver/dispensar reports

### Admin
- 6 roles: SUPER_ADMIN, ADMIN, MODERATOR, SUPPORT, FINANCE, CONTENT_REVIEWER
- Dashboard com métricas reais
- 9 tabs: Dashboard, Reports, Fotos, Perfis, Utilizadores, Verificações, Conversas, Auditoria, Beta
- Auditoria obrigatória (AdminAction) em todas as acções sensíveis
- Acesso a conversas exige motivo (logged)
- Risk score automático (C.5)

### Consentimento e Segurança
- ConsentCheck por fase (MATCH, CHAT, PHOTO_REQUEST, FACE_REVEAL, VIDEO_CALL, MEETING_PROPOSAL, SAFETY_CHECKIN)
- Validação por membership antes de criar/responder
- Safety checkins (criação, confirmação, cancelamento)
- Verificação de identidade (selfie → PENDING → admin aprova)

### Legal / Documentação
- Termos de Utilização, Política de Privacidade, Cookies, Segurança disponíveis em /legal/:page
- STATUS.md e SPRINTS.md actualizados
- Testes automatizados: 39 testes em 7 ficheiros

---

## 2. O que está parcialmente implementado

| Área | Estado | Detalhe |
|---|---|---|
| Consentimento granular no registo | PARTIAL | Apenas `termsAccepted` no schema de registo; não há campos separados por tipo |
| Consentimentos com IP/userAgent | PARTIAL | Schema tem ConsentType mas não guarda IP nem userAgent |
| Email verification | PARTIAL | `emailVerifiedAt` definido automaticamente em produção (ver risco crítico) |
| GDPR direito ao apagamento | PARTIAL | Sem endpoint `DELETE /api/auth/account` real; sem exportação de dados |
| Mensagens temporárias (expiresAt) | PARTIAL | Campo existe no schema mas sem job/worker que apague |
| Delete de foto (blurredPath) | PARTIAL | `deleteFile` só apaga `storagePath`; `blurredPath` permanece no R2 |
| ReportReason — categorias em falta | PARTIAL | Faltam: COERCION, REVENGE_PORN, DOXXING, PROSTITUTION_OR_ESCORT, PAID_SEXUAL_SERVICES, SCAM |
| Stripe em produção | PARTIAL | Stripe configurado em teste; fallback de upgrade directo existe sem guarda de NODE_ENV |
| Localização coarsened | PARTIAL | locationLat/locationLng guardados em exacto; discovery não arredonda |
| Verificação de selfie (storage path) | PARTIAL | URL da selfie não é guardado no modelo Verification |
| CONTACT_HASH_SECRET fallback | PARTIAL | Ainda tem fallback hardcoded em contacts.ts |
| URLs temporários para fotos | PARTIAL | R2 público; sem signed URLs com expiração |

---

## 3. O que está em falta

| Item | Prioridade |
|---|---|
| Endpoint DELETE /api/auth/account (RGPD) | BLOCKER |
| Endpoint GET /api/auth/export (RGPD) | ALTA |
| Consentimento granular no registo (7 campos) | ALTA |
| Email verification real (não automática em prod) | ALTA |
| Stripe production guard (bloquear upgrade directo em prod) | ALTA |
| Job/cron para apagar mensagens expiradas | MÉDIA |
| Delete foto apaga também blurredPath | MÉDIA |
| COERCION, REVENGE_PORN, DOXXING, etc. no ReportReason | MÉDIA |
| Signed URLs para fotos privadas | MÉDIA |
| Localização coarsened (arredondamento) | MÉDIA |
| Revogar consentimentos individuais | MÉDIA |
| Recurso de decisão admin (appeal) | BAIXA |
| Notificações por email (Resend) | BAIXA |
| Exportação de dados em JSON/ZIP | BAIXA |

---

## 4. Riscos Críticos

### RC-1: emailVerifiedAt definido automaticamente em produção
**Ficheiro:** `server/src/routes/auth.ts`
**Linha:** `emailVerifiedAt: new Date()`
**Impacto:** Qualquer email (incluindo emails falsos) é marcado como verificado no acto do registo. Viola RGPD (consentimento baseado em email não verificado) e abre porta a contas falsas em massa.
**Correcção:** Em produção, `emailVerifiedAt: null` e envio de email de verificação real via Resend.

### RC-2: Fallback hardcoded de CONTACT_HASH_SECRET em contacts.ts
**Ficheiro:** `server/src/routes/contacts.ts`
**Linha:** `const secret = process.env.CONTACT_HASH_SECRET || 'between-us-contact-secret-2026'`
**Impacto:** Se a variável não estiver definida em produção, o HMAC usa um segredo público e previsível, tornando o hashing reversível por força bruta.
**Correcção:** Falhar duro em produção se a variável não estiver definida.

### RC-3: Upgrade directo sem Stripe em qualquer ambiente
**Ficheiro:** `server/src/routes/subscriptions.ts`
**Impacto:** Se `STRIPE_SECRET_KEY` não estiver definida em produção, qualquer utilizador pode fazer upgrade para Premium gratuitamente.
**Correcção:** Em NODE_ENV=production, se não há Stripe configurado, devolver erro 503.

### RC-4: Sem endpoint de eliminação de conta (RGPD Art. 17)
**Impacto:** O RGPD exige que o utilizador possa pedir a eliminação dos seus dados. A ausência deste endpoint é uma violação legal directa se a plataforma processar dados de cidadãos da UE.
**Correcção:** Implementar `DELETE /api/auth/account` com soft-delete e job de limpeza.

---

## 5. Riscos Altos

### RA-1: Delete de foto não apaga blurredPath
**Impacto:** Fotos desfocadas permanecem no R2 indefinidamente após eliminação, consumindo espaço e mantendo dados do utilizador sem base legal.

### RA-2: Mensagens com expiresAt não são apagadas
**Impacto:** Sem job/cron, mensagens marcadas para expirar nunca são removidas efectivamente.

### RA-3: Categorias de denúncia críticas em falta
**Impacto:** COERCION, REVENGE_PORN, DOXXING, PROSTITUTION_OR_ESCORT não existem no enum. Violações graves não têm categoria adequada para moderação prioritária.

### RA-4: Localização exacta guardada no perfil
**Impacto:** locationLat/locationLng em precisão exacta. Se houver leak de BD, localização exacta dos utilizadores fica exposta.

### RA-5: URLs de fotos privadas são permanentes (R2 público)
**Impacto:** Uma vez partilhado, o URL de uma foto privada é acessível para sempre, mesmo após revogação de acesso.

---

## 6. Riscos Médios

- RM-1: Sem rate limiting em endpoints de upload de fotos
- RM-2: Sem limite de tamanho de mensagem no chat
- RM-3: Consentimentos criados automaticamente no registo sem aceitação explícita por campo
- RM-4: Webhook Stripe sem log de eventos (apenas processa, não regista)
- RM-5: Safety checkin sem alertas automáticos se não confirmado
- RM-6: Sem expiração de sessões inactivas (apenas maxAge do cookie)
- RM-7: Perfis sem localização podem aparecer no discovery sem zona definida

---

## 7. Riscos Baixos

- RB-1: Sem paginação em alguns endpoints admin (lista completa)
- RB-2: Error messages em inglês misturadas com português
- RB-3: Sem logging estruturado (apenas console.error)
- RB-4: Sem monitorização de erros (Sentry ou equivalente)
- RB-5: ts-node em produção (preferível build compilada)

---

## 8. Prioridades antes de beta público

1. Corrigir emailVerifiedAt automático em produção (RC-1)
2. Corrigir CONTACT_HASH_SECRET fallback (RC-2)
3. Bloquear upgrade directo sem Stripe em produção (RC-3)
4. Implementar DELETE /api/auth/account (RC-4)
5. Corrigir delete de foto (apagar blurredPath) (RA-1)
6. Adicionar categorias de denúncia em falta (RA-3)
7. Implementar consentimento granular no registo (RGPD)
8. Coarsen localização antes de guardar
9. Job para mensagens expiradas
10. Exportação de dados (RGPD Art. 20)

---

## 9. Quick wins (< 1h cada)

- Corrigir fallback CONTACT_HASH_SECRET (1 linha)
- Bloquear upgrade directo em produção (5 linhas)
- Adicionar categorias REVENGE_PORN, DOXXING, COERCION ao enum (migration)
- Apagar blurredPath no delete de foto (2 linhas)
- Remover emailVerifiedAt automático em produção (1 linha + env check)

---

## 10. O que NÃO deve ser feito ainda

- Não activar Stripe em modo live sem revisão legal dos Termos de Pagamento
- Não abrir registo público sem email verification real
- Não implementar pagamentos entre utilizadores
- Não adicionar chat de vídeo sem revisão de RGPD (dados biométricos/imagem ao vivo)
- Não publicar nas app stores sem revisão das políticas de conteúdo adulto da Apple/Google
- Não remover beta gate sem moderar os primeiros 50 utilizadores manualmente
