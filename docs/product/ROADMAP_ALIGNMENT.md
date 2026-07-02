# Alinhamento com Roadmap v2 — Between Us
> Data: Julho 2026
> Documento interno de análise honesta: roadmap proposto vs estado real do código.

---

## Resumo executivo

O documento de roadmap proposto está bem pensado e alinhado com boas práticas
para este tipo de produto. A boa notícia: **a maioria do MVP descrito já está
implementado**. A má notícia: algumas coisas críticas para lançamento ainda faltam,
e algumas estão implementadas de forma que precisa de revisão antes de utilizadores
reais.

**Posição actual:** algures entre v0.2 (MVP técnico) e v0.3 (Beta privado) do
roadmap proposto.

---

## O que já está feito (vs roadmap)

### ✅ Sprint 1 — Fundação
- Repositório Git, CI/CD (GitHub Actions), deploy Railway
- Backend Node.js/Express/TypeScript, PostgreSQL, Redis
- Autenticação funcional, migrations via Prisma

### ✅ Sprint 2 — Perfis
- Perfil individual com todos os campos descritos
- Perfil de casal com convite e Double Consent
- Sistema de intenções (YES/MAYBE/NO)
- Sistema de limites (boundaries)
- Upload de fotos com privacidade em 4 níveis
- Onboarding progressivo de 10 passos

### ✅ Sprint 3 — Discovery
- Feed com Between Score (pesos por intenção, limites, localização, tipo)
- Filtros por tipo de perfil e cidade
- Likes, passes, bloqueios
- Exclusão de admins, perfis PENDING, perfis INVISIBLE
- Bloqueio de contactos por HMAC-SHA256

### ✅ Sprint 4 — Matching
- Reciprocidade de likes → match automático
- Double Consent para casais (ambos aprovam)
- Estado PENDING_COUPLE_APPROVAL
- Listagem de matches

### ✅ Sprint 5 — Chat
- Chat em tempo real (Socket.io)
- Autorização por membership (não-membros bloqueados)
- Soft-delete de mensagens
- Denúncia de mensagens
- Acordo antes do chat (5 perguntas fixadas no topo)
- Safe Exit com 6 opções

### ✅ Sprint 6 — Privacidade e segurança
- Modo invisível (Premium)
- Fotos privadas com Soft Reveal
- Denúncias com 14 categorias e prioridade automática
- Painel de moderação (9 tabs)
- Suspensão e banimento com audit trail
- Risk score automático

### ✅ Sprint 7 — Pagamentos
- Planos Free e Premium implementados
- Stripe checkout e webhooks (4 eventos)
- Gestão de subscrição

### ✅ Sprint 8 — Beta fechado
- Sistema de convites (BetaInvite)
- BETA_CLOSED env var
- Painel admin para gerir convites

### ✅ Funcionalidades extra (além do MVP proposto)
- ConsentCheck por fase (7 fases) — não estava no roadmap
- Safety checkins para encontros presenciais
- Between Score com explicação visível ("Porquê este score?")
- Badges de verificação no discovery
- Audit log completo de acções admin com previousData/newData
- Customer support view no admin (editar/apagar utilizador + histórico)
- 39+ testes automatizados (Jest + GitHub Actions)
- RGPD: exportação de dados + eliminação de conta
- Coordenadas coarsened (±11km) antes de guardar

---

## O que falta do roadmap proposto

### ❌ BLOCKER para v0.3 (beta privado)

| Item | Roadmap diz | Estado actual |
|---|---|---|
| Email verification real | "Confirmação de email" (Etapa 2) | Endpoints criados, SMTP não configurado |
| Moderação humana activa | "Aprovar/rejeitar fotos" (Etapa 16) | Sistema existe, falta pessoa |
| Domínio próprio | Implícito em v1.0 | railway.app |

### ⚠️ Parcial — funcional mas incompleto

| Item | Roadmap diz | Estado actual | Gap |
|---|---|---|---|
| Verificação de idade | "Verificação de idade obrigatória" (Etapa 2) | Declarativa (data nasc.) + selfie opcional | ageVerifiedAt não preenchido após selfie aprovada |
| Fotos moderadas | "Imagem enviada para moderação" (Etapa 7) | PENDING em prod ✅ | Falta moderador humano activo |
| Localização aproximada | "Nada de mostrar coordenadas reais" (secção 4) | Coarsened ±11km ✅ | Distância calculada correctamente |
| Private Room | "Chat de grupo... regras fixadas" (Etapa 12) | UI existe (Modo Acordo + Safe Exit) | Backend dedicado não existe — usa chat normal |
| Travel Mode | "Disponibilidade por cidade/data" (Etapa 18) | Implementado | Sem expiração automática |
| Revogar consentimentos | "Revogar consentimentos opcionais" (Etapa 20) | Campo revokedAt existe | Sem endpoint dedicado |

### 🔲 Não implementado (fora do MVP proposto mas no roadmap)

| Item | Roadmap diz | Versão proposta |
|---|---|---|
| Recuperação de password | POST /api/password/reset | v0.3 |
| 2FA | "pelo menos numa fase posterior" | v1.5 |
| Mensagens temporárias (cron job) | Campo existe, job não corre | v1.0 |
| Signed URLs para fotos privadas | Implícito em "fotos privadas" | v1.0 |
| Landing page pública | "Páginas públicas" | v1.0 |
| Preços página pública | "Páginas públicas" | v1.0 |
| Notificações por email | "Email provider" | v1.0 |
| Videochamada | "Funcionalidades futuras" | v2.0 |
| App iOS/Android | "Fase 2" | v2.0 |

---

## Análise honesta: o que está bem e o que está mal

### ✅ Bem feito

**Segurança base:** bcrypt, JWT httpOnly, rate limiting, RBAC admin, audit log,
HMAC contactos, coarsen de coordenadas, validação Zod — tudo implementado e
funcionando.

**Consentimento:** mais completo do que o roadmap descreve — 5 campos obrigatórios
separados (não apenas `terms_accepted`), com IP e userAgent gravados. O roadmap
pede isso mas muitas apps não o fazem.

**Double Consent:** implementado correctamente com validação de membership — não
é possível um terceiro "aprovar" um match de um casal do qual não faz parte.

**Audit trail:** todas as acções admin têm `previousData`, `newData`, `reason`,
`internalNote`, `ipAddress`, `userAgent`. O roadmap não especifica tanto detalhe.

**Between Score:** implementado com explicação visível ao utilizador — ponto de
diferenciação que o roadmap descreve mas que poucas apps de dating fazem.

**Testes:** 39+ testes automatizados com CI/CD — o roadmap não menciona testes
mas são essenciais para manter a qualidade durante o beta.

### ⚠️ Atenção necessária

**Email verification:** é o blocker mais crítico. Sem emails reais, utilizadores
ficam bloqueados em PENDING_VERIFICATION sem conseguir activar a conta. O roadmap
coloca isto no Sprint 1. Deve ser resolvido antes de qualquer beta.

**Moderação:** o sistema existe e funciona. Falta activar a equipa humana.
O roadmap é claro: "Aprovar ou rejeitar fotos" é função essencial do admin.
Sem moderador activo, a fila de PENDING pode acumular indefinidamente.

**Recuperação de password:** `POST /api/password/forgot` existe mas retorna apenas
`{ message: 'Se este email existe...' }` sem enviar email real. Precisa de SMTP.

**Stripe:** em modo teste. O roadmap coloca Stripe live em v1.0. Não deve ser
activado sem revisão legal dos planos (ver PAYMENT_RISK_REVIEW.md).

### ❌ O que não está alinhado com o roadmap

**Private Room como backend dedicado:** o roadmap descreve tabelas `private_rooms`
e `private_room_members` dedicadas. O que está implementado usa o chat normal com
UI diferente. Para v1.5 (grupos a três, casais + terceiro), será necessário o
backend dedicado.

**Landing page:** o roadmap inclui "Landing page, Preços, Termos, Privacidade,
Segurança, FAQ" como páginas públicas. Nada disto existe — a app vai directamente
para login. Para v1.0 com utilizadores reais, é necessário.

**Página de preços pública:** `GET /api/plans` existe e funciona mas não há
página frontend que mostre os planos a visitantes não autenticados.

---

## Posição actual no roadmap

```
v0.1 — Protótipo          ✅ Completo
v0.2 — MVP técnico        ✅ Completo
v0.3 — Beta privado       🟡 90% — falta: email real, moderador, domínio
v1.0 — Lançamento         🔲 60% — falta: landing, preços, Stripe live, legal
v1.5 — Crescimento        🔲 30% — Travel Mode feito, resto por fazer
v2.0 — App mobile         🔲 0%
```

---

## Próximas 10 tarefas por prioridade (para chegar a v0.3)

| # | Tarefa | Impacto | Esforço | Tipo |
|---|---|---|---|---|
| 1 | Configurar Resend — email verification + password reset | CRÍTICO | Baixo (config) | Operacional |
| 2 | Designar moderador para fotos e reports | CRÍTICO | Zero (pessoa) | Operacional |
| 3 | Adicionar `ageVerifiedAt` quando selfie aprovada em admin | Alto | 5 min código | Técnico |
| 4 | Domínio próprio (ex: betweenus.app) no Railway | Alto | Baixo (DNS) | Operacional |
| 5 | Criar landing page pública simples | Médio | Médio | Técnico |
| 6 | Endpoint de recuperação de password (com email real) | Médio | Baixo | Técnico |
| 7 | Activar BETA_CLOSED=true no Railway | Médio | 1 click | Operacional |
| 8 | Criar primeiros 5-10 convites beta e testar fluxo completo | Médio | Zero | Operacional |
| 9 | Revisão legal dos documentos em /docs/legal/ | Alto | Externo | Legal |
| 10 | Configurar cron para cleanupExpiredMessages (Railway) | Baixo | 5 min | Operacional |

---

## O que o roadmap diz que já está mais avançado do que descreve

O roadmap descreve funcionalidades que a aplicação já tem em versão mais sofisticada:

- **Between Score:** o roadmap esboça pesos simples. A implementação tem score
  explicado, badges de verificação, e os conflitos de boundaries excluem perfis.
- **Consentimento:** o roadmap lista campos de UserConsent. A implementação tem
  IP, userAgent, versão e revogação — mais completo.
- **Admin:** o roadmap descreve um painel básico. A implementação tem RBAC com
  6 roles, audit trail com diff de dados, customer support view com histórico.
- **Matching:** o roadmap descreve Double Consent. A implementação valida membership
  do casal e requer ambos os parceiros — não apenas "dois likes".

---

## Conclusão

A aplicação está tecnicamente pronta para um beta privado controlado,
com duas condições não negociáveis:

1. **Email real** — sem SMTP, utilizadores não conseguem verificar a conta.
2. **Moderador activo** — sem revisão humana, fotos e perfis ficam em PENDING indefinidamente.

O código está bem estruturado, seguro para o contexto, e alinhado com os
princípios do roadmap: privacidade, consentimento, compatibilidade.

A próxima decisão não é de código — é operacional.
