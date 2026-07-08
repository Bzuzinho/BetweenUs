# Between Us — Beta Test Account Manifest (beta-v1)

Este documento lista todas as contas de teste criadas por `npm run db:seed:beta`. Todas as contas usam o domínio reservado `@betweenus.test`, têm `isTestAccount=true` e nunca recebem email real (o seed escreve diretamente na base de dados, sem passar por `/api/auth/register`).

**Password:** definida através da variável de ambiente `BETA_SEED_PASSWORD` no momento em que o seed correu. Não documentada aqui — pede ao autor da execução, ou consulta o gestor de segredos do Railway.

Pré-requisito: `npm run db:seed` (catálogos estruturais) tem de ter corrido primeiro.

## Contas administrativas

| Email | Role | Cenário | Testes esperados |
|---|---|---|---|
| beta.admin.super@betweenus.test | SUPER_ADMIN | Acesso completo | Admin/RBAC/config, includeTestData, hard-delete |
| beta.admin.admin@betweenus.test | ADMIN | Acesso amplo | Users/profiles/reports/subscriptions/metrics, sem SUPER_ADMIN-only |
| beta.admin.moderator@betweenus.test | MODERATOR | Moderação | Verification queue, fotos, reports + evidence |
| beta.admin.support@betweenus.test | SUPPORT | Apoio ao cliente | Users + reports, sem evidence |
| beta.admin.finance@betweenus.test | FINANCE | Billing | Subscriptions/metrics, sem moderação |
| beta.admin.content@betweenus.test | CONTENT_REVIEWER | Conteúdo | Guide/fotos/perfis, sem reports |

## Contas de lifecycle

| Email | Estado esperado | Cenário |
|---|---|---|
| beta.lifecycle.pending-email@betweenus.test | PENDING_VERIFICATION, sem email verificado | Registo incompleto |
| beta.lifecycle.pending-age@betweenus.test | PENDING_VERIFICATION, email verificado, Verification PENDING | À espera de verificação de idade |
| beta.lifecycle.active@betweenus.test | ACTIVE (via UserActivationService) | Ativação real |
| beta.lifecycle.suspended@betweenus.test | SUSPENDED | Não pode login |
| beta.lifecycle.banned@betweenus.test | BANNED | Não pode login |
| beta.lifecycle.profile-pending@betweenus.test | User ACTIVE, Profile PENDING_REVIEW | Fila de aprovação admin |
| beta.lifecycle.profile-rejected@betweenus.test | User ACTIVE, Profile REJECTED | Perfil rejeitado com motivo |
| beta.lifecycle.profile-hidden@betweenus.test | User ACTIVE, Profile HIDDEN | Oculto apesar de aprovado antes |

## Perfis individuais

| Email | Perfil | Cenário | Testes esperados |
|---|---|---|---|
| beta.marta@betweenus.test | Marta — Individual | Aberta a casais | Third Match com Casal 1 |
| beta.leonor@betweenus.test | Leonor — Individual | Exclui casais (hard boundary) | Nunca aparece a perfis COUPLE com seek_third |
| beta.diogo@betweenus.test | Diogo — Individual | Discrição máxima | visibilityMode=MATCHES_ONLY |
| beta.alex@betweenus.test | Alex — Individual, não-binário | Poliamor | Compatibilidade poly |
| beta.joana@betweenus.test | Joana — Individual | Ligação recorrente | Score alto com Marta |
| beta.tiago@betweenus.test | Tiago — Individual | singles_only | Excluído de perfis COUPLE |
| beta.ines@betweenus.test | Inês — Individual | Invisível | Nunca aparece em Discovery |
| beta.rui@betweenus.test | Rui — Individual | verified_only | Eligibility boundary |
| beta.catarina@betweenus.test | Catarina — Individual | Travel Mode ativo (Porto) | Discovery no destino |
| beta.miguel@betweenus.test | Miguel — Individual | Premium | Subscription PREMIUM ACTIVE |
| beta.sofia@betweenus.test | Sofia — Individual | Galeria privada | Soft Reveal |
| beta.noa@betweenus.test | Noa — Individual | Ainda a descobrir | Cold-start ranking |

## Perfis de casal

| Casal | Emails | Cenário | Testes esperados |
|---|---|---|---|
| Casal 1 — Ana & Pedro | beta.couple1.ana@betweenus.test, beta.couple1.pedro@betweenus.test | Third match happy path | Agreement ALIGNED, double consent ALL |
| Casal 2 — Carla & Nuno | beta.couple2.carla@betweenus.test, beta.couple2.nuno@betweenus.test | Agreement conflict | UI "não estão alinhados" sem revelar quem |
| Casal 3 — Vera + convite pendente | beta.couple3.vera@betweenus.test | Pending partner | coupleStatus=PENDING_PARTNER, excluído do Discovery |
| Casal 4 — Beatriz & Hugo | beta.couple4.beatriz@betweenus.test, beta.couple4.hugo@betweenus.test | Couple Travel Mode | Aprovação de ambos |
| Casal 5 — Rita & Filipe | beta.couple5.rita@betweenus.test, beta.couple5.filipe@betweenus.test | Máxima privacidade | Galeria privada + Soft Reveal |

## Grupo (só se `GROUP_PROFILES_ENABLED=true`)

| Grupo | Emails | Cenário |
|---|---|---|
| Trio Aurora | beta.group.luna@betweenus.test, beta.group.davi@betweenus.test, beta.group.iris@betweenus.test | 3 ProfileMembers, badge de Grupo, membership de Private Room |

## Cenários adicionais cobertos (não são contas próprias — usam o roster acima)

- Discovery/Between Score: pares de alta/média/baixa compatibilidade, conflito de hard boundary, conflito de intenção, bloqueio, invisível, contact block.
- Like/Pass/Match: like unilateral, match ativo, pass, match de casal pendente (0 e 1 aprovação), match de casal ativo, match terminado, match bloqueado, match pausado.
- Private Rooms A-F: INDIVIDUAL_PAIR ativo, COUPLE_SINGLE em espera de consentimento, COUPLE_COUPLE ativo, pausado, fechado, SAFETY_LOCKED.
- Consent Check: 7 fases (MATCH, CHAT, PHOTO_REQUEST, FACE_REVEAL, VIDEO_CALL, MEETING_PROPOSAL, SAFETY_CHECKIN) em vários estados.
- Shared Intentions (IntentAlignment): versionamento V1 ativo, V1 ativo + V2 em aprovação, V1 arquivado + V2 ativo.
- Reports: 6 motivos (FAKE_PROFILE, HARASSMENT, MINOR, NON_CONSENSUAL_IMAGE, THREAT, COERCION) com evidência.
- Verification queue: SELFIE aprovado/rejeitado, ID_DOCUMENT pendente, VIDEO aprovado.
- Safety Check-in: SCHEDULED, WAITING_CONFIRMATION, SAFE_CONFIRMED, CANCELLED, OVERDUE, ESCALATED (sem envio real de alerta — `safetyEmail` sempre `null` nestes dados de teste).
- Travel Mode: ativo, agendado, expirado, cancelado, casal em aprovação, casal aprovado.
- Subscriptions: FREE, PREMIUM ACTIVE, COUPLE_PREMIUM ACTIVE, PREMIUM CANCELLED, PREMIUM PAST_DUE, TRIALING.
- Guide: 5 artigos publicados, 3 rascunhos.
- Events: 5 eventos (políticas de venue distintas), com attendance em todos os estados.
- Circles: 4 circles, memberships em todos os estados.

## Comandos

```
npm run db:seed              # catálogos estruturais (pré-requisito)
npm run db:seed:beta         # este dataset
npm run db:seed:beta:validate
npm run db:seed:beta:cleanup
```
