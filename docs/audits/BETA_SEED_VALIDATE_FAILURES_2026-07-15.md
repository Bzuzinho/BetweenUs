# Análise das 22 falhas de `npm run db:seed:beta:validate` — 15 jul 2026

> **✅ RESOLVIDO — confirmado em produção (Railway) a 15 jul 2026:**
> `npm run db:seed` (catálogo estrutural) → `BETA_SEED_CLEANUP_CONFIRM=DELETE_TEST_DATA
> npm run db:seed:beta:cleanup` → `npm run db:seed:beta` → `npm run db:seed:beta:validate`
> devolveu **`Total: 140 | PASS: 140 | FAIL: 0`**, sem remover nenhuma verificação.
> Confirma as três causas raiz abaixo: o catálogo estrutural estava mesmo desatualizado
> (13 intentions / 24 boundaries / 4 agreement questions ficaram completos após o
> `db:seed`), o Report órfão desapareceu com o cleanup + `pruneStaleTestReports()`
> (reports passou de 5→4 com sem_evidencia=0), e o check de SafetyCheckin passou a
> bater certo mesmo com o cron de produção activo (`{"marta":"SCHEDULED",...}` — exactamente
> os 6 estados desenhados, porque desta vez `validate` correu logo a seguir ao seed).
> `lifecycle_profile_pending` também passou a PASS depois do cleanup — confirma que
> era mesmo uma linha residual de uma execução anterior, não um bug.

> Contexto: `npm run beta:gate` falhava consistentemente em `db:seed:beta:validate`,
> com 22 falhas em 140 checks (118 PASS). Instrução: nunca alterar a aplicação
> para fazer passar um teste errado — só corrigir a origem real do problema
> (seed, manifest ou validador), e nunca remover verificações.

Resultado: **das 22 falhas, zero são bugs de produção.** Todas têm origem no
próprio seed de teste ou no validador. Nenhum ficheiro em `server/src/routes`,
`server/src/lib` (fora do próprio validador/seed) ou schema de produção foi
alterado.

Ficheiros alterados (todos dentro de `server/prisma/betaSeed/`, nunca em
`server/src/routes` ou serviços de produção):

- `server/prisma/betaSeed/index.ts` — guard `checkStructuralSeedRan()` reforçado.
- `server/prisma/betaSeed/phases/safety.ts` — `pruneStaleTestReports()` adicionado.
- `server/prisma/betaSeed/validate.ts` — check de SafetyCheckin reescrito.

---

## Bugs reais

Nenhum encontrado. As 22 falhas dividem-se em duas causas, ambas em código de
teste (seed/validador), nunca em lógica de negócio de produção.

---

## Seed desatualizada (21 de 22 falhas)

### Causa raiz #1 — catálogo estrutural desatualizado no ambiente alvo (18 falhas)

**Ficheiros:** `server/prisma/betaSeed/phases/profiles.ts` (linhas 68–85, 263–271,
292–310) + `server/prisma/seed.ts` (catálogo estrutural).

`phases/profiles.ts`'s `catalogIds()` resolve cada slug de intenção/limite
(`seek_couple`, `no_couples`, `talk_first`, etc.) contra as tabelas `Intention`
e `Boundary` da base de dados. Se um slug não existir, o código faz
`console.warn(...); continue` — **falha silenciosa, por desenho** (comentário
original: "correu `npm run db:seed`?"). `npm run db:seed` (seed estrutural) é
idempotente por slug (upsert), mas só é re-executado manualmente; se o
ambiente alvo foi semeado uma vez há mais tempo, slugs adicionados depois a
`seed.ts` (ex.: `seek_couple`, `no_couples`, `couples_only`,
`no_emotional_involvement`) simplesmente não existem na base de dados —
mesmo com `intentionCount > 0` (o guard antigo só verificava contagem, nunca
os slugs específicos).

Isto explica, com 100% de correspondência aos dados reais devolvidos pelo
validador (`intentions=0/N boundaries=0/N` para os 12 perfis individuais, sem
exceção):

- 12x `[individual-profiles] individual_*: intentions/boundaries seeded (0/N)`
  — marta, leonor, diogo, alex, joana, tiago, ines, rui, catarina, miguel,
  sofia, noa.
- 2x `[discovery]` — leonor (no_couples) e tiago (singles_only) continuam a
  ver casais porque o `Boundary` correspondente nunca chegou a ser criado
  para o perfil deles (consequência directa do ponto acima).
- 1x `[candidate-constraints] Leonor x Casal 1` — mesma causa: sem
  `ProfileBoundary` com `no_couples`, `evaluateCandidateConstraints` não tem
  nada para avaliar e o `CompatibilityScore` chega a ser calculado.
- 4x `[couples] ProfileAgreement.status` (couple_1/2/4/5) — `seedAgreement()`
  em `phases/profiles.ts` (linha 292) depende de `AgreementQuestion` com slug
  `both_validate_match` e `Boundary` com slug `no_emotional_involvement`
  existirem; a mesma classe de lacuna no catálogo estrutural impede o fluxo
  real de `submitAnswer()` de progredir o acordo para `ALIGNED`/`CONFLICT`.

**Correcção aplicada:** `checkStructuralSeedRan()` em `index.ts` passou a
verificar, slug a slug, que tudo o que `scenarios.ts` e `seedAgreement()`
precisam existe mesmo na base de dados — não apenas que as tabelas têm
`count > 0`. Se faltar um slug, o seed **para imediatamente** com uma
mensagem explícita a listar os slugs em falta e a indicar `npm run db:seed`
como correcção, em vez de deixar 18 checks falharem silenciosamente minutos
depois em `validate.ts`.

**Acção necessária no ambiente do utilizador (não é algo que eu possa
executar a partir daqui — sem acesso a Postgres neste sandbox):**

```
npm run db:seed            # idempotente — só acrescenta slugs em falta
npm run db:seed:beta       # agora falha alto e cedo se algo ainda faltar
npm run db:seed:beta:validate
```

Se `npm run db:seed` já tiver sido corrido e o erro persistir com slugs
listados, isso confirma definitivamente que o catálogo em produção/staging
está desalinhado com o `seed.ts` actual — vale a pena confirmar com
`SELECT slug FROM "Intention"` / `"Boundary"` no ambiente real.

### Causa raiz #2 — Report órfão de uma versão anterior do seed (1 falha)

**Ficheiro:** `server/prisma/betaSeed/phases/safety.ts` (`REPORT_SPECS`,
`seedReports`).

`[reports] Cada report esperado tem pelo menos 1 ReportEvidence`:
`reports=5 sem_evidencia=1` — o validador espera exactamente 4 reports para as
razões HARASSMENT/MINOR/NON_CONSENSUAL_IMAGE/COERCION (as 4 que `REPORT_SPECS`
define hoje), mas encontrou 5. `Report` só é deduplicado pelo triplo actual
`(reporterUserId, reportedUserId, reason)`; como `REPORT_SPECS` foi reatribuído
a pares reporter/reportado diferentes ao longo do desenvolvimento deste seed,
uma execução antiga deixou um `Report` órfão (de uma versão anterior do
mapeamento) sem `ReportEvidence` associada — porque foi criado antes de as
chamadas `captureXXX` existirem para essa razão.

**Correcção aplicada:** `pruneStaleTestReports()`, chamado no início de
`seedReports()`, remove qualquer `Report` de conta de teste que já não
corresponda a nenhum triplo actual de `REPORT_SPECS` antes de recriar o
conjunto actual. `ReportEvidence.reportId` tem `onDelete: Cascade`
(`schema.prisma:1369`), por isso a limpeza é segura e não deixa evidência
órfã. Torna o re-seed idempotente por versão, não apenas aditivo.

### Causa raiz #3 — possível linha antiga de `lifecycle_profile_pending` (1 falha)

**Ficheiro:** `server/prisma/betaSeed/phases/profiles.ts`
(`createLifecycleProfiles`, linhas 105–125).

`[lifecycle] lifecycle_profile_pending: User ACTIVE, Profile PENDING_REVIEW`
falhou. Inspeccionei `accounts.ts` (define `User.status='ACTIVE'` para esta
conta — correcto) e `profiles.ts` (faz `prisma.profile.upsert` com
`update: { status: 'PENDING_REVIEW', ... }` incondicionalmente a cada
execução — também correcto). Não encontrei nenhum caminho de código, cron ou
hook que altere `Profile.status` para esta conta de teste especificamente.

Não consigo confirmar a causa exacta sem acesso à base de dados do ambiente
alvo (bloqueado neste sandbox — sem Postgres, sem `prisma generate`
disponível). A explicação mais provável, dado que o `upsert` é
auto-reparador a cada execução, é uma linha residual de uma versão anterior
do seed cujo `update` não chegou a correr nessa run específica (ex.: se a
run anterior falhou a meio, antes deste passo). **Não alterei código de
produção para este caso** — recomendo confirmar com uma nova execução limpa:

```
npm run db:seed:beta:cleanup   # remove dados de teste antigos
npm run db:seed:beta
npm run db:seed:beta:validate
```

Se esta falha persistir depois de um cleanup+reseed limpo (não apenas um
re-run aditivo), isso deixaria de ser explicável por dados obsoletos e
passaria a justificar uma investigação de bug real — nesse caso, reabrir
esta secção.

---

## Validador desatualizado (1 de 22 falhas)

**Ficheiro:** `server/prisma/betaSeed/validate.ts` (check "SafetyCheckin
cobre SCHEDULED/WAITING_CONFIRMATION/SAFE_CONFIRMED/CANCELLED/OVERDUE/ESCALATED").

Dados reais da falha: `{"marta":"SAFE_CONFIRMED","joana":"ESCALATED",
"rui":"SAFE_CONFIRMED","alex":"CANCELLED","catarina":"ESCALATED","sofia":"ESCALATED"}`
— esperado: marta=SCHEDULED, joana=WAITING_CONFIRMATION, catarina=OVERDUE.

Causa: o validador antigo fixava o `status` exacto de 6 `SafetyCheckin`
esperando um snapshot congelado logo a seguir ao seed. Mas
`safetyCheckinJobs.ts` (auditado na Fase 2.7) corre a cada ~10 min em
qualquer ambiente real, incluindo Railway, e as suas três queries
(`runSafetyCheckinRequestJob`/`runSafetyCheckinOverdueJob`/
`runSafetyCheckinEscalationJob`) não filtram `isTestAccount` — **por
desenho**, é exactamente isso que prova que o pipeline de segurança funciona
ponta-a-ponta mesmo para dados semeados. Três dos seis perfis
(marta/joana/catarina) foram semeados em estados **não-terminais**
(SCHEDULED/WAITING_CONFIRMATION/OVERDUE); assim que o respectivo
`scheduledAt`/janela de graça expira, o cron real avança-os — o que
aconteceu antes de `validate.ts` correr. Os outros três (rui/alex/sofia)
foram semeados já em estado **terminal** (SAFE_CONFIRMED/CANCELLED/ESCALATED)
e por isso continuaram a bater certo.

Isto não é um bug de seed (os dados foram semeados correctamente através dos
serviços reais) nem de aplicação (o cron a avançar checkins vencidos é o
comportamento correcto e desejado em produção) — é o validador a assumir um
instantâneo congelado que uma aplicação viva com cron activo nunca garante.

**Correcção aplicada:** o check passou a usar os marcadores de transição
permanentes do schema (`requestSentAt`, `overdueAt`, `confirmedAt`,
`cancelledAt`, `escalatedAt` — escritos uma única vez por
`safetyCheckinStateMachine.ts` e nunca limpos por transições posteriores) em
vez do `status` mutável para os 3 perfis não-terminais, confirmando que o
seed exerceu mesmo a transição desenhada e que o estado actual é
alcançável a partir daí (nunca "recuou" para um estado impossível). Para
rui/alex/sofia (estados terminais, nenhum job os move mais) manteve-se a
verificação exacta de `status`. Nenhuma verificação foi removida — a
cobertura das 6 transições continua obrigatória, apenas deixou de exigir que
o relógio pare no instante do seed.

---

## Resultado esperado

Depois de (1) confirmar/actualizar o catálogo estrutural no ambiente alvo com
`npm run db:seed`, e (2) correr `npm run db:seed:beta:cleanup && npm run
db:seed:beta && npm run db:seed:beta:validate` com as três alterações acima:

- As 18 falhas da causa raiz #1 devem desaparecer assim que o catálogo
  estrutural estiver completo (acção do utilizador, fora do meu alcance
  neste sandbox sem Postgres).
- A falha de `reports` deve desaparecer automaticamente (código corrigido).
- A falha de `safety` deve deixar de ser sensível ao tempo entre seed e
  validate (código corrigido).
- `lifecycle_profile_pending` deve auto-corrigir-se num re-seed limpo; se não
  corrigir, é o único item que precisa de nova investigação com acesso à BD.

Não corri `npm run db:seed:beta:validate` eu próprio — este sandbox não tem
Postgres/Redis nem acesso a `binaries.prisma.sh` (bloqueado pela allowlist de
rede, confirmado nas sessões anteriores). Os três ficheiros alterados foram
verificados com `tsc --noEmit` limpo contra uma cópia com o conteúdo real
(confirmado via leitura directa, para contornar um atraso de sincronização
conhecido do mount) — ver commits para os diffs exactos.
