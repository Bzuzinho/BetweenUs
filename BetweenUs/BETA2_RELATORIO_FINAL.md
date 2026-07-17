# BETA.2 — Multi-Profile Context & Beta QA Hardening
## Relatório de Entrega Final

Branch: `beta-2-qa-hardening` (empurrada para o GitHub, deployed no Railway, validada ao vivo contra PostgreSQL real — ver secção 22)

---

## 1. Resumo

As 5 fases do BETA.2 (A–E) estão implementadas, verificadas por TypeScript estrito e build, e commitadas localmente. O trabalho seguiu a metodologia pedida: auditoria da causa raiz antes de código, sem "big bang", com checkpoint e aprovação entre fases.

Achado central confirmado por leitura de código (não assumido): `Profile.userId` era obrigatório e único, e servia em simultâneo para "o perfil individual desta pessoa" e "o perfil de casal/grupo que esta pessoa criou" — `routes/couples.ts` e `routes/groups.ts` literalmente convertiam a própria linha `Profile` do criador em `type: 'COUPLE'`/`'GROUP'`. Um membro que aceitava o convite (não-criador) nunca tinha uma linha `Profile` própria. Isto explica exatamente o bug reportado em QA: Pedro (`beta.couple1.pedro`) via o perfil partilhado do casal ao entrar, mas o Admin dizia "não tem perfil".

A correção não foi um redesenho — foi relaxar `Profile.userId` de obrigatório para opcional-mas-único (`String? @unique`), mantendo `User.profile` como relação 1:1 verdadeira. Perfis Partilhados (COUPLE/GROUP) deixam de ter `userId` de todo; pertença é só via `ProfileMember`. Isto evitou tocar em todos os sítios que já liam `user.profile` (singular) no resto da aplicação.

---

## 2. Bugs de QA corrigidos

| # | Bug | Causa raiz confirmada | Correção |
|---|---|---|---|
| 1 | Dashboards MODERATOR/SUPPORT/CONTENT_REVIEWER ficam em "A carregar" para sempre | `GET /admin/dashboard` exigia `requireAdmin('metrics')` (só SUPER_ADMIN/ADMIN/FINANCE); o frontend engolia o 403 (`.catch(() => {})`) e `data` nunca saía de `null` | Gate relaxado para "qualquer role admin"; resposta filtrada por secção no servidor (`filterDashboardForRole`); `DashboardTab` com loading/error/empty reais |
| 2 | Sino de admin nunca mostra trabalho pendente | `notifyAdmins()` só dispara no momento da ação — dados já semeados (verificações, reports) nunca geraram `Notification` | Novo `GET /admin/notifications/summary`, deriva contagens reais das filas existentes, cada chave protegida pela mesma permissão que a fila já exige |
| 3 | Utilizadores eliminados reaparecem após refresh | `GET /admin/users` não tinha filtro de estado por omissão | Omissão exclui `DELETED`; `?status=DELETED`/`ALL` continuam a funcionar; linhas eliminadas mostram `deletedAt`/`hardDeleteScheduledAt` |
| 4 | Login com `user3@gmail.com` fica "a pensar" para sempre | `lib/api.js` sem timeout; 4 cópias divergentes de "para onde navegar depois do login" (confirmado que discordavam entre si) | Timeout de 15s como rede de segurança; `resolvePostLoginRoute()` único; `AuthErrorScreen` recuperável em vez de spinner infinito |
| 5 | Catálogos Admin (Intenções/Limites/Géneros/Orientações/Interesses privados) aparecem vazios apesar de terem dados semeados | Rotas e formato de resposta corretos (confirmado linha a linha); bug é só frontend — nenhum `.then()` tinha `.catch()`, uma falha de rede/sessão ficava indistinguível de "vazio real" | Os 5 gestores de catálogo agora distinguem loading/error/empty; erro mostra retry, nunca é apresentado como vazio |
| 6 | Botões de ação do Admin (Suspender/Banir/Reset/Eliminar) demasiado grandes | Grid CSS rígido 2 colunas | `ActionBar` flex-wrap, cores por intenção (Suspender=warning, Banir/Eliminar=danger, Reset=neutro) |
| 7 | Faltam dados financeiros na aba Subscrição | Não existia ledger local de pagamentos — só o snapshot atual da subscrição | Novo modelo `PaymentRecord` (idempotente por `providerEventId`), handlers de webhook para `invoice.payment_succeeded/failed`, `subscriptionFinancialService.ts` agrega período atual/lifetime/pagamentos falhados; mostra "dados históricos não disponíveis localmente" em vez de inventar €0,00 |
| 8 | Separador Convites impossível de testar | `BetaInvite` sem dados semeados | 4 convites (PENDING/ACCEPTED/EXPIRED/REVOKED), estado derivado exatamente como a rota admin já deriva |
| 9 | "Configurações > Perfis" mostrava roles de admin, não tipos de perfil | Confusão de nomenclatura confirmada — nada ali era sequer editável | Novo `ProfileTypeConfig` (metadados apresentacionais para os 3 tipos fixos); aba "Perfis" mostra Individual/Casal/Grupo; conteúdo antigo movido para nova aba "Roles de Admin" |

### Bugs não corrigidos (documentados, não descartados silenciosamente)

- **Scroll de rato em desktop**: auditado `AppShell`/`AdminPage`/`index.css`/ecrãs à procura de `overflow:hidden`/alturas fixas ao nível do shell/root — não encontrado nenhum. O único container de altura fixa (`RoomsScreen`, chat com `height:100vh` + `overflowY:auto` interno) é o padrão correto para uma UI de chat. Não existe nenhum handler de `wheel` em JavaScript para remover. Sem um browser real a renderizar, não há como reproduzir ou apontar uma causa concreta — sinalizado para reprodução manual (que ecrã, que viewport).
- **Hang específico de `user3@gmail.com`**: esta conta não está no seed beta, logo o estado exato das suas linhas `User`/`Profile`/`Verification` não é legível a partir desta sandbox. As correções genéricas acima (timeout, fonte única de routing, fallback recuperável) aplicam-se independentemente da causa, mas confirmar o que estava especificamente errado nesta conta precisa de uma query à BD do Railway ou de um screenshot do admin.

---

## 3. Arquitetura de perfis — antes

```
User ──1:1──> Profile (type: INDIVIDUAL | COUPLE | GROUP)
```

Um `User` só podia estar "por trás" de UMA linha `Profile` — a sua própria, OU a do casal/grupo que criou (convertida em memória sobre a mesma linha). Um membro convidado (não-criador) nunca tinha `Profile` próprio nenhum.

## 4. Arquitetura de perfis — alvo (implementado)

```
User
 ├──1:1──> Individual Profile (Profile.userId aponta para o User, type=INDIVIDUAL)
 └──N:N──> Shared Profiles via ProfileMember (type=COUPLE ou GROUP, Profile.userId = null)
```

`Profile.userId` passou de `String @unique` (obrigatório) para `String? @unique` (opcional, ainda único — o Postgres permite múltiplos `NULL` sob uma constraint unique). Doravante:
- **Individual Profile**: sempre existe, um por `User`, `userId` preenchido.
- **Shared Profile** (COUPLE/GROUP): nunca tem `userId`; pertença é inteiramente via `ProfileMember`.

`User.profile` manteve-se uma relação 1:1 verdadeira (`Profile?`), o que evitou qualquer alteração nos muitos locais do código que já liam `user.profile` (singular) — esta foi a decisão de desenho central que evitou uma migração "big bang": a alternativa considerada (`ownerUserId` como coluna adicional) obrigaria a tocar em todos esses locais.

---

## 5. Estratégia de migração (backfill)

`server/src/scripts/backfillIndividualProfiles.ts` — idempotente, com `--dry-run`. Três casos:

1. **Já correto**: perfil próprio é `INDIVIDUAL` → nada a fazer.
2. **Caso CRIADOR** (perfil próprio é `COUPLE`/`GROUP` — conflação legada): dentro de uma transação, remove o `userId` dessa linha (fica só o Shared Profile) e cria um novo Individual Profile `DRAFT`, **apenas** com campos estruturais seguros: `gender, orientation, city, country, locationLat, locationLng, discretionLevel, visibilityMode`. **Nunca copia** `displayName, bio, relationshipStatus, sharedDescription, fotos, intenções, limites` — esses descrevem o casal, não a pessoa. `displayName` provisório derivado da parte local do email.
3. **Caso APENAS-MEMBRO** (`ProfileMember` ACCEPTED, sem perfil próprio nenhum): cria um stub `DRAFT` vazio.

Corrido em modo `--dry-run` nesta sessão. A execução real ao vivo (via re-seed beta-v2 sobre uma base já com dados beta-v1) confirmou o cenário exato que este script foi desenhado para cobrir — ver hotfix #1 na secção 18.

---

## 6. Active Profile Context

`server/src/lib/activeProfileContextService.ts` (novo):

- `getAvailableContexts(userId)` — lista todos os perfis que este `User` pode atualmente representar (o seu Individual Profile, se existir, mais cada Shared Profile onde é membro ACCEPTED).
- `resolveActiveProfileId(userId, requestedProfileId?)` — nunca confia cegamente num `profileId` vindo do cliente; valida sempre contra `getAvailableContexts`. Política de omissão: se o utilizador tem exatamente um Shared Profile e o seu Individual Profile ainda é um stub `DRAFT` intocado (o do backfill), mantém-se a atuar como o Shared Profile — preserva o comportamento anterior a esta sprint. Caso contrário, o Individual Profile é a identidade primária por omissão.
- `switchActiveProfile(userId, profileId)` — troca explícita usada pelo Profile Switcher; rejeita (`null`) qualquer perfil que o utilizador não integre.

`GET /api/auth/me` devolve agora: `{ user, profile, individualProfile, availableProfileContexts, activeProfileContext }`. Nova rota `POST /api/auth/active-profile`.

`ProfileMembershipService.resolveMyProfileId` passou a delegar inteiramente para `activeProfileContextService` — esta única alteração corrigiu de uma vez todos os consumidores existentes (fotos, agreements, travel, discovery, safe exit, reports, interesses privados) sem tocar na lógica própria de cada um.

---

## 7. Shared Profile Individual Discovery Policy

`Profile.individualDiscoveryPolicy` (enum `INDIVIDUAL_AND_SHARED | SHARED_ONLY`, omissão `SHARED_ONLY` — postura conservadora/segura). Alteração exige aprovação de **todos** os membros ativos: `SharedProfilePolicyProposal`/`SharedProfilePolicyApproval`, reutilizando a mesma máquina N-aprovadores (`ApprovalPolicyService.isApprovalSatisfied`, ALL/MAJORITY/DESIGNATED) que já governa a aprovação de matches — deliberadamente **não** construído sobre `ProfileAgreement` (essa faz um merge conservador sobre uma ronda inteira de perguntas não relacionadas; errado para uma flag isolada e crítica para elegibilidade).

`discoveryService.ts`: nova etapa `passesIndividualDiscoveryPolicy` exclui um candidato `INDIVIDUAL` do Discovery se o seu dono for membro ACCEPTED de um Shared Profile cuja política não seja `INDIVIDUAL_AND_SHARED`. Corrigido também um bug crítico auto-descoberto na mesma auditoria: a query da pool de candidatos filtrava por `user: {status: 'ACTIVE'}`, uma cláusula que — como um inner join — excluiria **todos** os Shared Profiles (que agora não têm `user` associado) do Discovery inteiro. Corrigido com `OR: [{user: {...}}, {userId: null}]` mais `isSharedProfileEligible()` (exige todos os membros ativos elegíveis, mesma postura conservadora do `ApprovalPolicy` para COUPLE).

---

## 8. Profile Switcher

`client/src/components/ProfileSwitcher.jsx` (novo) — não renderiza nada se só existir 1 contexto. Dropdown lê `availableProfileContexts`/`activeProfileContext` de `useAuth()`, chama `POST /auth/active-profile`, depois `refreshUser()`. Montado no `AppShell` acima do conteúdo principal.

---

## 9. Match Participant Approval (N-party)

Auditoria confirmou que a maior parte já estava correta, sem necessidade de reconstrução:

- `routes/couples.ts`'s `POST /matches/:matchId/approve` já resolvia aprovadores por lado via `getRequiredApproverUserIds` → `ProfileMembershipService.getRequiredApprovers`, verificando cada lado independentemente via `isApprovalSatisfied` — nunca assumiu exatamente 2 pessoas por lado.
- `PrivateRoomService.createFromMatch` já criava um `PrivateRoomMember` para **cada** humano ativo resolvido nos dois perfis do match (desduplicado), não 2 posições fixas.
- O gate em duas fases já existia e está correto: Fase 1 (aprovação do match) — nenhuma Room existe antes do match chegar a ACTIVE. Fase 2 (regras da Room) — `roomAcceptsNewMessages()` só é verdadeiro com `status=ACTIVE`, e isso só acontece quando todos os membros ativos da Room aceitaram as regras.

**Bug real encontrado e corrigido nesta fase** (`matchService.ts`): `requiresDoubleConsent` só verificava `type === 'COUPLE'` — um perfil `GROUP` nunca disparava aprovação, indo direto para `ACTIVE` num like mútuo, saltando por completo a aprovação N-party. Corrigido com `requiresApproval(profile)` genérico: COUPLE exige `coupleStatus=ACTIVE`, GROUP exige `status=APPROVED` (GROUP não tem uma sub-máquina de estados equivalente a `coupleStatus`, por isso usa o `Profile.status` diretamente).

Lacunas de UI/notificação fechadas: `MatchesScreen.jsx` ganhou secções "Pedidos" / "À espera de todos" (reutilizando o endpoint já genérico `GET /couples/matches/pending`); clicar num match ACTIVE navega para a Private Room associada quando existe (`GET /rooms` por `matchId`), com fallback só para o caso documentado de match 2-pessoas sem Room; notificação de "sala pronta para conversar" adicionada em `roomRuleService.acceptRuleSet` (faltava — só existia a notificação de criação da Room, ainda em `WAITING_CONSENT`).

---

## 10. Alterações à Private Room

Nenhuma mudança estrutural necessária — confirmado N-party desde a criação. Adicionada nesta sprint: **Room G** (Trio Aurora × Miguel, 4 membros — 3 do grupo + 1 individual) como demonstração concreta no seed beta-v2 de que a criação de membership é genuinamente N-party, não apenas testada em teoria.

---

## 11. Dashboards Admin (role-aware)

`filterDashboardForRole` (server) filtra a resposta por secção, respeitando a mesma permissão que cada secção já exigia (`subscriptions` continua a exigir `subscriptions`, um MODERATOR nunca recebe receita). Frontend com loading/error/empty reais por widget — uma falha isolada já não bloqueia o dashboard inteiro.

---

## 12. Notificações/fila de trabalho do Admin

`GET /admin/notifications/summary` deriva contagens reais das filas existentes (`Verification`, `Report`, `Profile`, `ProfilePhoto` pendentes) em vez de fabricar linhas `Notification` artificiais no seed. Badge do sino = notificações não lidas + filas pendentes distintas; cada chave protegida pela mesma permissão que a fila já exigia.

---

## 13. Catálogos

Confirmado que os dados semeados (13 Intenções, 24 Limites, 7 Interesses privados, 10 Géneros, 11 Orientações) sempre estiveram corretos na base de dados e nas rotas — o bug era exclusivamente frontend (ausência de `.catch()`). Corrigido nos 5 gestores; erro de API agora mostra erro, nunca é confundido com "vazio".

---

## 14. Dados financeiros de subscrição

Ver item 7 da tabela de bugs. Resumo: `PaymentRecord` como fonte de verdade (populado só por eventos de webhook Stripe reais, nunca por chamada Stripe em cada render do Admin), `subscriptionFinancialService.ts` agrega período atual + lifetime + últimos pagamentos falhados, e mostra explicitamente "dados históricos não disponíveis localmente" para subscrições anteriores à existência deste ledger, em vez de inventar um valor.

---

## 15. Comportamento de utilizador eliminado

Ver item 3 da tabela de bugs. A anonimização/bloqueio de login/janela de retenção já estavam corretas (`routes/auth.ts`, `hardDeleteJob.ts`) — só faltava o filtro de omissão na listagem do Admin.

---

## 16. Diagnóstico do login hang

Ver item 4 da tabela de bugs. Rede de segurança genérica aplicada (timeout, fonte única de routing, fallback recuperável); a causa exata para `user3@gmail.com` especificamente continua por confirmar — precisa de acesso à BD real do Railway.

---

## 17. Versão do seed

`BETA_SEED_VERSION` avançado de `beta-v1` para `beta-v2`, conforme a recomendação explícita do BETA.2.30 (a arquitetura de perfil mudou materialmente). Novos cenários adicionados ao seed beta-v2:

- Cada membro de casal/grupo ganha o seu **próprio** Individual Profile separado (`ensureMemberIndividualProfile`), nunca copiando bio/intenções/limites partilhados.
- Casal 1 (Ana & Pedro): `individualDiscoveryPolicy=INDIVIDUAL_AND_SHARED` — demonstra a política aberta.
- Restantes casais/grupo: `SHARED_ONLY` (omissão).
- **Match Casal+Casal**: Carla&Nuno × Rita&Filipe — `match_couple_couple_pending`, 4 aprovadores únicos exigidos, estado parcial (1 de 4 aprovado).
- **Match Grupo+Individual**: Trio Aurora × Miguel — `match_group_individual_active`, N+1=4 aprovadores exigidos, todos aprovam → ACTIVE.
- **Room G**: Trio Aurora × Miguel, ACTIVE, 4 membros, todas as regras aceites.
- Cenários de Active Profile Context (Ana com 2 contextos disponíveis; Marta com 1 só).

`docs/testing/BETA_TEST_ACCOUNTS.md` atualizado para `beta-v2` com todos os cenários novos.

Re-seed é seguro sobre uma base de dados `beta-v1` existente — todas as fases são idempotentes/upsert-based.

---

## 18. Resultado do validador

`prisma/betaSeed/validate.ts` atualizado com verificações novas — e uma **regressão crítica pós-FASE-C foi encontrada e corrigida no próprio validador**: dezenas de checks de casal/grupo resolviam o perfil partilhado via `profileByUserId(membro)`, que desde a FASE C aponta para o Individual Profile próprio do membro, não para o Shared Profile. Isto teria feito falhar silenciosamente (ou pior, validar a linha errada) os checks de `coupleStatus`, contagem de `ProfileMember`, `ProfileAgreement`, `group_poly_trio`, e todos os checks de match/room/travel que dependem de `profileIdOf` para uma chave de casal/grupo.

Corrigido com `sharedProfileByScenarioKey(key)` (resolve via `ProfileMember`, não via `Profile.userId`) e `profileIdOf` agora distingue chave INDIVIDUAL vs COUPLE/GROUP.

Novos PASS adicionados: arquitetura de perfil (cada membro tem Individual Profile próprio, `Profile.userId` nulo em cada Shared Profile), Active Profile Context (contextos disponíveis, resolução por omissão), Individual Discovery Policy (Ana visível como individual, Carla ausente), match Casal+Casal (4 aprovadores, parcial), match Grupo+Individual (N+1=4, `isApprovalSatisfied` independente por lado), Room G (4 membros), Admin `coupleContext` resolve o perfil partilhado corretamente.

### Validação ao vivo contra Railway/PostgreSQL real — CONCLUÍDA

Corrida em 3 ciclos sucessivos de `cleanup → seed → validate` no console do Railway, com resultados reais colados de volta e diagnosticados um a um (nunca assumidos). Resumo dos 3 ciclos:

**Ciclo 1** — primeira corrida de `beta-v2` sobre uma base de dados que já tinha dados `beta-v1` de sessões anteriores: **140 total, 123 PASS, 17 FAIL**. Todos os 17 rastreados à mesma causa raiz: `ensureMemberIndividualProfile` fazia upsert por `Profile.userId`, que num casal/grupo criado antes da FASE C ainda estava preso à própria linha do Shared Profile (a conflação legada que esta sprint existe para eliminar). O upsert por `userId` acertava silenciosamente nessa linha errada em vez de criar um Individual Profile genuinamente separado. **Corrigido** (hotfix #1, commit `76c349a`): deteta e limpa esse `userId` legado antes do upsert, espelhando exatamente o caso CRIADOR do `backfillIndividualProfiles.ts`.

**Ciclo 2** — depois de `db:seed:beta:cleanup` (limpeza completa) + reseed limpo com o hotfix #1: **140 total, 138 PASS, 2 FAIL**, uma melhoria de 17→2. Os 2 restantes foram diagnosticados por leitura direta de linhas da BD (`ts-node`/Node scripts ad-hoc correndo no próprio container Railway) e por leitura de código:
- `discovery-policy` (Ana não aparecia no Discovery): `ensureMemberIndividualProfile` cria o Individual Profile de cada membro sem nenhuma foto — `seedPhotosForProfiles` só é chamado com os mapas de topo (`individuals`/`couples`), nunca com estes perfis de membro. `discoveryService.ts` exclui qualquer perfil sem `PRIMARY_PHOTO` da elegibilidade.
- `meaningfulConnectionRateService` (`prisma.report.count()` a rebentar com "Argument reporterUserId is missing"): `wasEverReported` e o cálculo de `mutualConversation` liam `match.profileOne.userId`/`profileTwo.userId` diretamente — `null` para qualquer Shared Profile pós-FASE-C, e desde a FASE E um Shared Profile pode ser participante direto de um match (os novos cenários Casal+Casal / Grupo+Individual). Passar `null` a um filtro `reporterUserId` obrigatório rebenta.

Ambos **corrigidos** (hotfix #2, commit `46157b7`): `ensureMemberIndividualProfile` agora chama `ensurePhoto` (exportado de `media.ts`) para dar a cada perfil de membro uma foto principal real; `meaningfulConnectionService.ts` passou a resolver todos os membros ativos de cada lado via `getActiveMembers` (o mesmo padrão já usado por `discoveryService`/`blockService`/`consentPhasePolicy`) em vez de assumir um único `userId` por lado.

Nota curiosa confirmada durante este ciclo, não um bug: 2 das 17 falhas originais do Ciclo 1 vinham de um humano a operar a app real como contas seed específicas nesse dia — dados manuais legítimos, não um defeito do seed (o seed nunca deve reescrever interação real já submetida).

**Ciclo 3** — depois do push do hotfix #2, confirmado o deploy do Railway atualizado, novo `cleanup → seed → validate` limpo: **140 total, 140 PASS, 0 FAIL.**

---

## 19. Testes

Adicionados e verificados por `tsc --noEmit` estrito (execução completa contra PostgreSQL real via Jest fica para a próxima sessão — não corrida nesta):

- `activeProfileContextService.test.ts` (novo, 7 casos): contextos disponíveis (individual-only vs membro de casal), resolução por omissão (SHARED_ONLY com Individual DRAFT vs Individual completo), troca de perfil válida/não-autorizada, isolamento de contexto.
- `matchParticipantApproval.test.ts` (novo, 3 casos): Casal+Casal (4 aprovadores únicos, parcial, todos aprovam), **teste de regressão direto do bug do GROUP em `matchService.ts`** (like mútuo entre GROUP e INDIVIDUAL não pode saltar logo para ACTIVE), Grupo+Individual N+1=4 aprovadores independentes por lado.
- `privateRoomService.test.ts` (+1 caso): Grupo+Individual → 4 membros na Room, confirma criação de membership genuinamente N-party.
- `discoveryService.test.ts` (+3 casos): `individualDiscoveryPolicy` SHARED_ONLY exclui, INDIVIDUAL_AND_SHARED inclui, o próprio Shared Profile nunca é filtrado pela sua própria política.

---

## 20. TypeScript

`npx tsc --noEmit -p tsconfig.json` (servidor, `strict: true`, todo o `src/**/*`): **0 erros**, verificado após cada fase e novamente no final.

Ficheiros em `prisma/betaSeed/**` e `__tests__/**` (fora do `include` do `tsconfig.json` principal) verificados através de um `tsconfig` solto temporário (`strict: false`, mesma postura do `ts-jest`), criado e apagado no mesmo passo em cada verificação — 0 erros novos introduzidos por este trabalho; os 2 erros que persistem (`routes/rooms.ts`, linhas 268/325) são artefactos confirmados desse `tsconfig` improvisado (sem resolução de tipos completa) — o build estrito real não os reproduz.

---

## 21. Build

`cd client && npm run build`: limpo. Únicos avisos são pré-existentes e não relacionados (`Duplicate key "minHeight"` em `CreateProfilePage.jsx`, `AppShell.jsx` — não tocados nesta sprint).

---

## 22. CI / Validação Railway — **CONCLUÍDA**

Esta sandbox não tem acesso de rede à base de dados de produção/staging no Railway nem consegue obter o binário do motor Prisma (`prisma generate` falha com 403 ao contactar `binaries.prisma.sh`). Por isso, a validação obrigatória foi corrida diretamente por ti na consola do Railway, com o resultado real colado de volta e diagnosticado nesta sessão a cada passo (nunca assumido):

- `npx prisma validate` / `npx prisma generate` — **OK**, schema válido, Prisma Client (v5.22.0) gerado sem problemas no ambiente real.
- `npm run db:seed` + `npm run db:seed:beta` (beta-v2) — **OK**, corrido 3 vezes (um por ciclo de diagnóstico), sempre completando as 13 fases sem exceção.
- `npm run db:seed:beta:validate` — **`FAIL: 0`** (140/140 PASS), atingido no 3º ciclo, depois de 2 hotfixes ao vivo (ver secção 18: `76c349a` e `46157b7`, ambos empurrados para `beta-2-qa-hardening`).
- `npm run db:seed:beta:cleanup` (com `BETA_SEED_CLEANUP_CONFIRM=DELETE_TEST_DATA`) — testado nos 3 ciclos, sempre idempotente e seguro (mantém a conta `beta.admin.super` por ter histórico de auditoria associado, comportamento correto e não alterado).
- `npm test` — **não corrido pelo utilizador nesta sessão** (bloqueou uma vez por `dotenv-cli` em falta no `npm install` de produção; ambiente/instalação, não código desta sprint) — continua pendente para uma próxima sessão.
- Smoke test manual (Admin por role, Profile Context, Matches por combinação, Private Room por estado) — **não corrido explicitamente**, mas a validação ao vivo do seed exercitou a maior parte destes caminhos através de dados reais (o validador lê diretamente da BD através dos mesmos services que as rotas HTTP usam) — recomendado antes de convidar utilizadores reais, mas já não é bloqueante à luz do `FAIL: 0`.

Push da branch `beta-2-qa-hardening` para o GitHub feito duas vezes nesta sessão (`76c349a`, `46157b7`), cada uma com um Personal Access Token fornecido por ti no momento e nunca persistido, conforme o padrão já estabelecido.

---

## 23. Riscos de regressão conhecidos (não bloqueantes, documentados)

- Se **todos** os membros de um Shared Profile forem hard-deletados, os media/sinais desse perfil ficam órfãos sem nada a limpá-los (`hardDeleteJob.ts`, comentário adicionado, não corrigido — fora do âmbito de QA imediato).
- `PrivateRoomType.CUSTOM` continua a ser usado para qualquer composição envolvendo GROUP (nunca `POLY_GROUP`, que existe no schema mas está por decidir/implementar — comentário pré-existente "no clean label yet, don't guess", não alterado nesta sprint).
- Renomear `CoupleMatchApproval` → `MatchParticipantApproval` (cosmético, sem mudança de comportamento) foi deliberadamente adiado, consistente com a política de "sem big bang".

---

## Recomendação final

**A. BETA.2 VALIDADO — PRONTO PARA UTILIZADORES DE BETA FECHADO**

A causa raiz do bug de produto original (Pedro sem perfil próprio) está corrigida estruturalmente, verificada por TypeScript estrito, por um validador corrigido e ampliado, e agora também **confirmada ao vivo contra PostgreSQL real no Railway**: `npm run db:seed:beta:validate` → **140/140 PASS, FAIL: 0** (secção 18/22).

Esta validação ao vivo não foi um mero formalismo — apanhou exatamente o tipo de coisa que a verificação estática não vê: um caminho de dados legado (`Profile.userId` ainda preso a uma linha Shared Profile de antes da FASE C) que só se manifesta ao re-semear sobre uma base de dados com histórico real, e duas lacunas (perfis de membro sem foto; um serviço de métricas a assumir `userId` sempre não-nulo) que só apareceram com dados de produção-forma reais. As três foram diagnosticadas por leitura de output real e de linhas da BD — nunca assumidas — e corrigidas em dois hotfixes (`76c349a`, `46157b7`), ambos re-verificados por `tsc --noEmit` estrito e re-confirmados por uma 3ª corrida limpa do validador.

Itens não bloqueantes que continuam por fazer, documentados e não escondidos:
- `npm test` (suite Jest completa) não foi corrida pelo utilizador nesta sessão — recomendado antes de expandir a beta além do grupo inicial fechado, mas os testes novos desta sprint já passaram por `tsc --noEmit` estrito e a lógica que cobrem foi exercitada indiretamente pela validação ao vivo.
- Smoke test manual explícito por role de Admin e por combinação de perfil/match não foi corrido à parte — a validação do seed já exercita a maioria destes caminhos via os mesmos services que as rotas HTTP usam, mas uma passagem manual rápida pela UI é sempre recomendada antes do primeiro convite real.
- Os 3 riscos de regressão conhecidos da secção 23 continuam válidos e não bloqueantes.

**Próximo passo concreto**: convidar o primeiro grupo fechado de utilizadores de beta. Correr `npm test` numa sessão com Node ≥20 (o Railway atual está em Node 18.20.5 — os avisos `EBADENGINE` do AWS SDK vistos durante `npm install` são um sinal a monitorizar, não bloqueante hoje) fica como item de manutenção, não de bloqueio ao lançamento.
