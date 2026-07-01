# Between Us — Estado Real do MVP
> Última actualização: Julho 2026
> ⚠️ Documento interno. Não publicar.

---

## Legenda
- **DONE** — implementado, testado, pronto para beta
- **PARTIAL** — existe mas tem gaps ou riscos conhecidos
- **RISKY** — existe mas com risco legal, técnico ou de segurança activo
- **BLOCKER** — em falta, impede beta público responsável
- **NOT_STARTED** — não implementado

---

## Infra e Plataforma

| Funcionalidade | Estado | Notas |
|---|---|---|
| Backend Node.js/Express/TypeScript | DONE | Railway, ts-node |
| Base de dados PostgreSQL | DONE | Railway volume persistente |
| Redis (refresh tokens) | DONE | Hash SHA-256, rotação real |
| Cloudflare R2 (ficheiros) | DONE | Bucket betweenus |
| Socket.io (chat real) | DONE | |
| GitHub Actions CI | DONE | 39 testes automatizados |
| Logging estruturado | NOT_STARTED | Apenas console.error |
| Monitorização de erros (Sentry) | NOT_STARTED | |
| Build compilada (não ts-node) | NOT_STARTED | ts-node em produção |

---

## Autenticação

| Funcionalidade | Estado | Notas |
|---|---|---|
| Registo com validação de idade (≥18) | DONE | |
| Login com bcrypt (cost 12) | DONE | |
| JWT + cookies httpOnly | DONE | |
| Refresh token com Redis | DONE | |
| Rate limiting auth | DONE | 10/15min |
| Beta gate (BETA_CLOSED) | DONE | |
| Email verification real | **BLOCKER** | emailVerifiedAt definido automaticamente em prod |
| Consentimento granular (7 campos) | **BLOCKER** | Apenas termsAccepted no registo actual |
| IP/userAgent nos consentimentos | PARTIAL | Schema não tem campos; proposta de migration necessária |

---

## Perfis

| Funcionalidade | Estado | Notas |
|---|---|---|
| Perfil individual | DONE | |
| Perfil de casal | DONE | Double Consent |
| Onboarding progressivo (10 passos) | DONE | DRAFT → PENDING_REVIEW |
| Intenções YES/MAYBE/NO | DONE | |
| Boundaries | DONE | |
| Verificação de identidade (selfie) | PARTIAL | Upload funciona; URL da selfie não guardado no modelo |
| Localização coarsened | **RISKY** | Coordenadas exactas guardadas; sem arredondamento |

---

## Discovery

| Funcionalidade | Estado | Notas |
|---|---|---|
| Feed com Between Score | DONE | |
| Filtros (tipo, cidade) | DONE | |
| Admin excluído | DONE | |
| PENDING_REVIEW excluído | DONE | |
| INVISIBLE excluído | DONE | |
| Bloqueio de contactos (HMAC) | PARTIAL | Fallback hardcoded em contacts.ts — ver RC-2 |
| Distância aproximada | PARTIAL | showDistance existe mas sem coarsening real das coords |

---

## Matches e Chat

| Funcionalidade | Estado | Notas |
|---|---|---|
| Like/Match (matchService.ts) | DONE | Single source of truth |
| Double Consent para casais | DONE | |
| Chat em tempo real | DONE | |
| Autorização por membership | DONE | |
| Mensagens soft-deleted | DONE | deletedAt |
| Acordo antes do chat | DONE | |
| Safe Exit | DONE | 6 opções |
| Mensagens temporárias (expiresAt) | PARTIAL | Campo existe; sem job de limpeza |
| Reportar mensagem específica | PARTIAL | reportedMessageId existe; sem UI dedicada |

---

## Fotos

| Funcionalidade | Estado | Notas |
|---|---|---|
| Upload com validação magic bytes | DONE | |
| Pipeline sharp (EXIF, resize, blur) | DONE | |
| PENDING em produção | DONE | |
| Soft Reveal (4 níveis) | DONE | |
| Pedido de acesso (PhotoAccessRequest) | DONE | Exige match activo |
| Revogação de acesso | DONE | |
| Delete limpa storagePath | DONE | |
| Delete limpa blurredPath | **RISKY** | blurredPath não é apagado no delete |
| URLs temporários (signed) | NOT_STARTED | R2 público; URLs permanentes |
| Moderação de fotos de verificação | PARTIAL | Selfie enviada mas URL não persistido |

---

## Privacidade

| Funcionalidade | Estado | Notas |
|---|---|---|
| Modo Invisível (Premium) | DONE | |
| Ocultar distância | DONE | |
| Modos de notificação | DONE | |
| Travel Mode | DONE | |
| Contact blocking (HMAC) | PARTIAL | Fallback inseguro em prod |
| Consentimento para contact hashing | NOT_STARTED | ConsentType.CONTACT_HASHING existe mas não é verificado |
| Revogar consentimentos | NOT_STARTED | |
| Exportar dados (RGPD Art. 20) | **BLOCKER** | Não implementado |
| Eliminar conta (RGPD Art. 17) | **BLOCKER** | Não implementado |

---

## Reports e Moderação

| Funcionalidade | Estado | Notas |
|---|---|---|
| Reports básicos | DONE | |
| Prioridade automática | DONE | MINOR/THREAT=10, reincidência=8 |
| Admin resolve/dispensa | DONE | |
| ReportReason completo | PARTIAL | Faltam: COERCION, REVENGE_PORN, DOXXING, PROSTITUTION_OR_ESCORT, PAID_SEXUAL_SERVICES, SCAM |
| Notificação ao utilizador sobre decisão | NOT_STARTED | |
| Recurso/appeal de decisão | NOT_STARTED | |
| Workflow documentado | NOT_STARTED | |

---

## Admin

| Funcionalidade | Estado | Notas |
|---|---|---|
| Dashboard com métricas | DONE | |
| Gestão de utilizadores | DONE | |
| Moderação de fotos | DONE | |
| Moderação de perfis | DONE | |
| Verificações | DONE | |
| Acesso a conversas (com motivo) | DONE | Auditado em AdminAction |
| Audit log | DONE | |
| Risk score automático | DONE | |
| Beta invites | DONE | |
| Gestão de subscrições | PARTIAL | Listagem em falta no admin |

---

## Consentimento

| Funcionalidade | Estado | Notas |
|---|---|---|
| ConsentCheck por fase | DONE | 7 fases |
| Validação por membership | DONE | |
| Safety checkins | DONE | |
| Consentimento no registo | **RISKY** | Apenas termsAccepted; sem granularidade |
| Versão de T&C nos consentimentos | PARTIAL | version='1.0' hardcoded |

---

## Pagamentos (Stripe)

| Funcionalidade | Estado | Notas |
|---|---|---|
| Checkout Stripe (sessão) | DONE | Modo teste |
| Webhook Stripe (5 eventos) | DONE | |
| Planos definidos (Premium, Casal) | DONE | |
| Stripe bloqueado em prod sem config | **BLOCKER** | Upgrade directo possível sem Stripe |
| Logs de payment events | PARTIAL | Webhook processa mas não loga |
| Revisão legal dos planos | **BLOCKER** | Não feita |
| Stripe live | NOT_STARTED | Requer revisão legal antes |

---

## Resumo BLOCKERs antes de beta público

1. Email verification real (não automática)
2. Consentimento granular no registo
3. DELETE /api/auth/account (RGPD)
4. GET /api/auth/export (RGPD)
5. Stripe production guard (bloquear upgrade sem config)
6. Revisão legal dos Termos antes de activar pagamentos
