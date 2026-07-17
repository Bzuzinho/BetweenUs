# Revisão de Subscrições FREE/PREMIUM/COUPLE_PREMIUM — Estado (Fase 1 + 2 + 3D) — 16 jul 2026

> **Actualização 16 jul 2026 (mesmo dia, sessão seguinte):** a Fase 3D — Travel
> Mode por país/cidade, sem georreferenciação — foi implementada e verificada.
> Ver secção 7, no final deste documento. As referências a "Travel Mode
> geográfico real: não implementado" nas secções 3/4 abaixo (texto original da
> Fase 2) ficaram desactualizadas por essa secção 7 — mantidas tal como
> escritas na altura, para preservar o histórico da decisão, mas não descrevem
> o estado actual.

> Este pedido (secções 1-24 do prompt original) é um projecto grande — serviço
> central de entitlements, gate de score mínimo, diferenciação de preview,
> Travel Mode geográfico real, bloqueio de agenda, fotografias, filtros,
> Stripe checkout/portal/webhooks, ~72 testes e 4 documentos. Não cabe
> honestamente numa única sessão de implementação com o rigor pedido
> (nunca alterar código sem confirmar a causa, nunca simplificar, testes para
> tudo). Este documento regista o que ficou **implementado e verificado** na
> Fase 1, e o que fica **pendente** para uma Fase 2 — para nunca passar a
> falsa impressão de "tudo feito".

---

## 1. Auditoria inicial

- **AGENTS.md**: existe em `BetweenUs/AGENTS.md`, mas está vazio (só o
  cabeçalho "Imported Claude Cowork project instructions" — sem conteúdo
  próprio a seguir).
- **Git**: branch `beta-4-typecheck-fix`, sincronizado com `origin`. Só havia
  alterações não commitadas dos 3 ficheiros da sessão anterior
  (`prisma/betaSeed/*`, já entregues). Confirmado via `git log`: já existe
  trabalho prévio directamente relevante — commit `42838d2` **"BETA.4 —
  Pending connection requests in Matches + monetization package"**, que:
  - já criou `GET /api/matches/pending-requests` (pedidos de ligação
    recebidos, **sempre grátis por decisão de produto explícita** — bate
    certo com a secção 4 deste pedido);
  - já introduziu `FREE_MAX_ACTIVE_MATCHES` (limite de conversas activas) e
    `FREE_MAX_PHOTO_ACCESS_REQUESTS` — limites por **contagem**, distintos do
    modelo por **score mínimo** agora pedido. Mantidos (não estavam em
    conflito directo com o pedido actual, e removê-los seria alterar
    funcionalidade fora deste escopo);
  - já ordena o Discovery com prioridade Premium (sort dimension separada do
    Between Score, nunca inflacionando o score em si).
- **Docs lidos**: `PAYMENT_RISK_REVIEW.md` (confirma "ver quem gostou"/
  equivalente como funcionalidade aceitável para a Stripe — a mudança de
  nome para "pedido de ligação" mantém-se dentro do aceitável), `MVP_STATUS.md`
  (desactualizado — não reflecte o estado real mais avançado descrito nas
  instruções do projecto, tratado como contexto histórico apenas).
- **Schema**: `Subscription` (plan FREE/PREMIUM/COUPLE_PREMIUM/ELITE, status
  ACTIVE/CANCELLED/PAST_DUE/UNPAID/TRIALING, `cancelAtPeriodEnd`), `Match`,
  `ProfileAction` (enum `ActionType`: LIKE/PASS/SUPER_LIKE/BLOCK/REPORT —
  **decidido não renomear** para não partir migrations/dados, per regra
  explícita do pedido), `TravelMode`/`TravelModeApproval` (já suporta
  aprovação de casal — cidade/país são **strings**, sem lat/lng nem raio:
  gap real para a secção 9, ver ponto 10 abaixo), `CompatibilityScore`
  (cache do Between Score, com `getOrCalculateScore` já centralizado em
  `compatibilityScoreService.ts`).
- **Achado crítico de auditoria**: `middleware/auth.ts` tinha uma função
  `requirePremium` (gate `plan !== 'FREE'` puro) **nunca importada em
  nenhuma rota** — código morto. O gate real do Modo Invisível em
  `privacy.ts` tinha exactamente o mesmo defeito (`sub.plan !== 'FREE'`,
  sem checar `status`/`currentPeriodEnd`/`cancelAtPeriodEnd`) — confirma a
  preocupação da secção 11 do pedido, com localização exacta.
- **Stripe**: `subscriptions.ts` devolvia `url` (frontend já lia
  `checkoutUrl` — `PremiumPage.jsx` já estava à espera do nome novo, só o
  backend estava desalinhado). `POST /cancel` mudava `status: 'CANCELLED'`
  imediatamente, contradizendo a própria mensagem de resposta ("mantém-se
  até ao fim do período"). Não existia `POST /portal`
  (`PremiumPage.jsx` já chamava `api.post('/subscriptions/portal')` — 404
  garantido). `webhooks.ts`'s `checkout.session.completed` calculava
  `currentPeriodEnd = Date.now() + 30 dias` **hardcoded**, nunca lido da
  Stripe. Activação de parceiro em `COUPLE_PREMIUM` não validava que o
  perfil era mesmo `COUPLE` com exactamente 2 membros antes de activar.

---

## 2. Implementado e verificado nesta sessão

### 2.1 Serviço central de entitlements
**Novo:** `server/src/lib/subscriptionEntitlementService.ts`.

Funções: `getUserSubscriptionState`, `isSubscriptionEffectivelyActive` (nunca
`plan !== 'FREE'` sozinho — considera `status`, `currentPeriodEnd`,
`cancelAtPeriodEnd`, e tolerância `PAST_DUE`), `resolveEffectivePlan`,
`getActiveContextSubscriptionState` (resolve o contexto activo real —
individual/casal/grupo — e se é premium via QUALQUER membro activo pago,
reaproveitando o padrão que `matchService.isProfilePremium` já usava),
`hasEntitlement`, `getEligibility`, `canPurchasePlan`,
`getPremiumBeneficiaryUserIds`, `canSendConnectionRequest`,
`canViewIncomingConnectionProfile`, `getAvailablePlansForUser`.

Entitlements exactamente como pedido na secção 13 (`INVISIBLE_MODE`,
`TRAVEL_MODE`, `CONNECTION_BELOW_SCORE_THRESHOLD`,
`VIEW_FULL_INCOMING_CONNECTION_PROFILE`, `ADVANCED_FILTERS`,
`CONTACT_BLOCKING`, `ADVANCED_SOFT_REVEAL`, `ADVANCED_PHOTO_ACCESS_CONTROLS`,
`COUPLE_SHARED_PREMIUM`) — nenhum entitlement criado para bloqueio, denúncia,
Double Consent, revogação básica ou chat básico (essas não passam por
`hasEntitlement`, continuam sempre gratuitas por construção, não por gate).

`PAST_DUE_GRACE_DAYS` (env `SUBSCRIPTION_PAST_DUE_GRACE_DAYS`, default 3
dias) — política explícita pedida na secção 19: mantém acesso um pouco além
de `currentPeriodEnd` em `PAST_DUE` (dá tempo às Smart Retries da Stripe),
`UNPAID`/`CANCELLED` nunca concedem acesso.

### 2.2 Score mínimo 70% para pedidos de ligação FREE (secção 3)
- `discoveryService.ts`: nova função exportada `buildScoreInput(profileId)`
  — reaproveita exactamente o mesmo `toScoreInput` que o pipeline de
  Discovery já usa, para o score do gate nunca poder divergir do score real
  mostrado ao utilizador.
- `subscriptionEntitlementService.canSendConnectionRequest` — Premium/Couple
  Premium (via `resolveEffectivePlan` do(s) dono(s) do perfil) ignoram o
  limiar; FREE é bloqueado com `MIN_COMPATIBILITY_REQUIRED` se
  `getOrCalculateScore` (nunca um valor do cliente) `< 70`.
- Fio ligado no **único ponto** que decide like→match para ambas as rotas
  (`matchService.createLikeOrMatch`, usado por `discovery.ts` e
  `couples.ts` — corre **depois** do bloqueio bidireccional existente,
  nunca o substitui). `discovery.ts` e `couples.ts` devolvem agora 403 com
  `code`, `requiredScore`, `actualScore` exactamente no shape pedido.

### 2.3 Modo Invisível — gate central (secção 11)
- `privacy.ts`: `sub.plan !== 'FREE'` → `hasEntitlement(userId,
  'INVISIBLE_MODE', profileId)`. Corrige dois problemas ao mesmo tempo: (a)
  não considerava `status`/período, (b) verificava só a subscrição do
  `req.userId!`, nunca a dos outros membros de um perfil de casal — um
  membro não-comprador de um `COUPLE_PREMIUM` não conseguia activar Modo
  Invisível no perfil partilhado antes desta correcção.

### 2.4 Endpoint de planos (secção 15)
`GET /api/subscriptions/plans` — sem sessão devolve só os planos estáticos
(uso público, ex. landing); autenticado devolve `currentPlan`,
`effectivePlan`, `activeContext`, `eligibility` (`PREMIUM`/`COUPLE_PREMIUM`
com `allowed`+`reason`), `entitlements`, `connectionPolicy`
(`minimumScoreToSendRequest`, `canConnectBelowThreshold`,
`canViewFullIncomingProfile`) — shape igual ao pedido na secção 15, tudo
calculado no backend.

### 2.5 Elegibilidade de planos (secção 14)
`getEligibility`: `PREMIUM` bloqueado só para contexto `GROUP`;
`COUPLE_PREMIUM` exige `type=COUPLE` + `coupleStatus=ACTIVE` +
`activeMemberCount===2`, com motivo explícito (`COUPLE_PROFILE_REQUIRED`,
`COUPLE_PENDING_PARTNER`, `COUPLE_MUST_HAVE_EXACTLY_TWO_MEMBERS`).

### 2.6 Stripe — checkout, portal, cancelamento, webhooks (secções 17-20)
- `checkoutUrl` devolvido (mantendo `url` por compatibilidade) —
  `PremiumPage.jsx` já esperava `checkoutUrl`, só o backend estava
  desalinhado.
- `POST /checkout` valida `canPurchasePlan` antes de criar sessão (nunca
  `COUPLE_PREMIUM` para GROUP/casal incompleto/pendente), bloqueia checkout
  duplicado (já tem o plano activo), `activeProfileId`/`activeProfileType`
  na metadata resolvidos **só no backend**, nunca aceites do pedido.
- **Novo:** `POST /portal` — Stripe Customer Portal, `return_url` para
  `/premium`, 404 claro sem `providerCustomerId`.
- `POST /cancel` corrigido: já não muda `status` para `CANCELLED` de
  imediato — só `cancelAtPeriodEnd=true` + `cancelledAt`. O acesso só é
  removido quando `customer.subscription.deleted` chegar da Stripe.
- `webhooks.ts`'s `checkout.session.completed`: `currentPeriodEnd` já não é
  inventado (30 dias) — lê `stripe.subscriptions.retrieve()` para o período
  real. Activação de parceiro em `COUPLE_PREMIUM` agora valida — **outra
  vez, no webhook, nunca confiando só na validação já feita no
  checkout** — que o perfil é mesmo `COUPLE` com exactamente 2 membros
  activos antes de activar quem quer que seja; recusa e regista erro em
  vez de activar terceiros.

### 2.7 PremiumPage.jsx (secção 16) — parcial
- Corrigido um bug real pré-existente não relacionado com este pedido mas
  encontrado ao editar o ficheiro: `colors.lavender` (variável nunca
  definida — só `C` existe neste componente) fazia o botão Couple Premium
  rebentar em runtime. Substituído por `C.primary`.
- Terminologia: "Ver quem deu like em ti" → "Ver o perfil completo de quem
  te enviou um pedido de ligação" (nos dois sítios: backend `PLANS.premium.
  features` e frontend `PLANS`).
- Página passou a consumir `GET /subscriptions/plans` e a filtrar os planos
  mostrados por `eligibility` real do backend.
- **Não fez ainda**: a mensagem explícita "muda para o perfil do casal
  para comprar Between Casal" quando o utilizador pertence a um casal mas
  está no contexto individual — precisa de um endpoint que diga "este
  utilizador pertence a algum perfil COUPLE" além do contexto activo
  (`getAvailableContexts` já tem essa informação no backend; falta
  expor/consumir no frontend). Marcado pendente para não inventar uma
  mensagem sem confirmar que está correcta.

---

## 3. Fase 2 (implementada nesta sessão, depois da Fase 1)

- **Secção 4/5 — Preview limitado FREE vs perfil completo PREMIUM**:
  `GET /api/matches/pending-requests` continua sempre grátis/visível (a
  lista em si, decisão de produto BETA.4 — nunca mudou), mas agora devolve
  `preview` (tipo, faixa etária em bucket de 5 anos, cidade geral, Between
  Score real, intenções agregadas por nome, verificação, foto — sempre
  passada por `mergePhotosForViewer`, nunca a foto limpa antes de match/
  aprovação real) para toda a gente, e `full` (nome, bio, todas as fotos
  aprovadas) só quando `canViewIncomingConnectionProfile` é verdadeiro.
  `MatchesScreen.jsx` foi actualizado para consumir a nova forma e mostrar
  um CTA de upsell quando `canViewFullProfile` é falso.
  Corrigido de caminho um problema de segurança real e não relacionado com
  o pedido original: a rota antes devolvia `storagePath`/`blurredPath` em
  bruto, sem passar pela política de acesso (`mediaAccessPolicy`) — ou seja,
  uma foto `PRIVATE_AFTER_MATCH`/`PRIVATE_AFTER_APPROVAL` podia vazar a
  versão limpa a alguém que ainda nem tinha match. Corrigido ao mesmo tempo
  que esta secção, por tocar exactamente nesta rota.
- **Secção 10 — Filtros FREE/PREMIUM no Discovery**: `DiscoveryFilters`
  ganhou `verifiedOnly`, `maxDistanceKm`, `ageMin`, `ageMax`,
  `intentionSlug` (avançados) ao lado de `type` (básico, sempre grátis).
  `discovery.ts` só os aplica depois de confirmar `ADVANCED_FILTERS` via
  `hasEntitlement` — nunca um 403, os filtros são simplesmente ignorados
  para FREE — e a resposta passou a incluir `appliedFilters`,
  `ignoredFilters` e `advancedFiltersAvailable`, para o cliente saber
  exactamente o que aconteceu. `ageFromDOB`/`bucketAge` foram extraídos
  para `utils/age.ts` partilhado (evita duplicar a mesma lógica entre
  `matches.ts` e `discoveryService.ts`).
- **Secção 7 — Bloqueio de contactos da agenda**: `POST /api/contacts/block`
  agora exige a entitlement `CONTACT_BLOCKING` (verificada antes até do
  consentimento RGPD de hashing, para nunca pedir consentimento a quem nem
  tem acesso à funcionalidade). `GET /blocked/count` e `DELETE /blocked`
  continuam sem gate — gerir uma lista já criada nunca deve ficar preso.
  Bloqueio manual de perfil (`POST /api/privacy/block/:id`) confirmado
  intacto e continua sempre grátis — são rotas e conceitos diferentes.
- **Secção 8 — Fotografias**: confirmado por auditoria que a revogação
  básica (`PUT /access-requests/:id/revoke`) e a gestão básica (upload,
  `PUT`/`DELETE /:id`) nunca tiveram gate nenhum — continuam grátis, como
  exigido. Corrigido um bug real encontrado na mesma rota: o limite
  `FREE_MAX_PHOTO_ACCESS_REQUESTS` decidia "és premium?" com
  `sub.plan !== 'FREE' && sub.status === 'ACTIVE'` directamente — o mesmo
  anti-padrão que a secção 11 do pedido pede para nunca usar (ignorava
  `currentPeriodEnd` e a tolerância de `PAST_DUE`). Substituído por
  `resolveEffectivePlan`. Não foram construídos controlos avançados novos
  (acesso temporário, auto-expiração, por álbum, níveis de blur, histórico
  de acessos, aprovação conjunta de casal) — nada disso existe hoje no
  schema/código, e construir de raiz ficaria fora do que é razoável validar
  nesta sessão sem uma base de dados real para testar. `ADVANCED_PHOTO_
  ACCESS_CONTROLS`/`ADVANCED_SOFT_REVEAL` já existem no serviço de
  entitlements, prontos para quando essas funcionalidades forem construídas.
- **Secção 9 — Travel Mode, elegibilidade**: `POST /api/travel` (criar uma
  janela de viagem) agora exige a entitlement `TRAVEL_MODE`, que por sua vez
  tem um caso especial próprio (não o genérico): um `COUPLE_PREMIUM`
  conta para um perfil `COUPLE`, mas NUNCA para um perfil `GROUP` de que a
  mesma pessoa também faça parte — só um `PREMIUM`/`ELITE` pessoal conta
  para `GROUP`. Isto fecha exactamente a lacuna que a secção 9 do pedido
  descreve ("GROUP nunca recebe Travel Mode via COUPLE_PREMIUM"). A
  aprovação de casal (`WAITING_MEMBER_APPROVAL` → `SCHEDULED`) já existia
  e não foi tocada.
  **Não implementado**: a diferenciação geográfica real (mudar o centro de
  pesquisa do Discovery para as coordenadas do destino). `TravelMode` só
  tem `city`/`country` como texto, sem `latitude`/`longitude`/raio — dar
  isto a sério implica (a) uma migration aditiva no schema e (b) um
  fornecedor de geocoding (Google/Mapbox/Nominatim), que não existe hoje na
  stack e implicaria pedir-te uma chave de API nova. Não avancei com isto
  sem confirmares a abordagem, para não inventar uma integração externa
  às escondidas nem arriscar uma migration não testada (sem Postgres
  disponível neste sandbox para a correr). O que já existe — o Between
  Score dar um bónus de compatibilidade quando as cidades de viagem
  coincidem (`betweenScoreService.travelOverlaps`) — continua a funcionar,
  mas é só um bónus de pontuação, não uma mudança do conjunto de perfis
  candidatos.

## 4. Pendente (Fase 3 — não implementado)

Registado explicitamente para nunca dar a falsa impressão de estar feito:

- **Secção 9 — Travel Mode geográfico real**: ~~ver acima — decisão de
  arquitectura (schema + geocoding) por confirmar contigo.~~ Feito na Fase
  3D (ver secção 7) — **sem geocoding**, por decisão explícita do pedido
  Fase 3D (país/cidade como texto normalizado, nunca coordenadas).
- **Secção 21 — Testes**: nenhum teste automatizado novo escrito ainda para
  nada disto (nem os ~72 pedidos, nem um subconjunto).
- **Secção 22 — Documentação**: `SUBSCRIPTION_ENTITLEMENTS.md`,
  `CONNECTION_REQUESTS.md`, `STRIPE_SANDBOX_SETUP.md` ainda não escritos.
  `TRAVEL_MODE.md` **já escrito** na Fase 3D —
  `docs/product/TRAVEL_MODE.md`.
- **Secção 23 — Validações**: `npm run test`/`npm run build`/`npm run
  beta:gate` não corridos (sem Postgres/Redis neste sandbox). `npm run
  typecheck` foi simulado com sucesso via uma cópia isolada com `tsc
  --noEmit` (ver secção 5) para todos os ficheiros tocados nas Fases 1 e 2,
  mas recomendo correres o `typecheck` real no teu ambiente antes de
  mergear, como confirmação final independente.
- **`PremiumPage.jsx`**: mensagem de "muda de contexto" para um membro de
  casal a ver a página em contexto individual (ver 2.7) — ainda não feita.

---

## 5. Verificação feita nesta sessão

Sandbox sem Postgres/Redis e sem acesso a `binaries.prisma.sh` (mesma
limitação já documentada em sessões anteriores) — não consegui correr
`npm test`, `npm run build` nem `npm run beta:gate` aqui.

O mount bash mostra conteúdo desactualizado/truncado para ficheiros
editados na mesma sessão (bug já conhecido de sessões anteriores —
sincronização atrasada do fuse-mount, não afecta o ficheiro real, só a
vista via bash). Fase 1: reconstrução via Read tool + `tsc --noEmit`
isolado deu 0 erros para os 5 ficheiros centrais
(`subscriptionEntitlementService.ts`, `matchService.ts`,
`subscriptions.ts`, `webhooks.ts`, `privacy.ts`) — `discoveryService.ts`,
`discovery.ts` e `couples.ts` só foram verificados visualmente nessa altura.

Na Fase 2, reconstruí **também** `discoveryService.ts`, `discovery.ts` e
`couples.ts` na íntegra (516/259/367 linhas respectivamente) na mesma cópia
isolada, e voltei a correr `npx tsc --noEmit -p tsconfig.json` sobre o
projecto inteiro: **0 erros** — incluindo agora todas as alterações da
Fase 1 e da Fase 2 juntas (`matches.ts`, `discoveryService.ts`,
`discovery.ts`, `couples.ts`, `contacts.ts`, `photos.ts`, `travel.ts`,
`subscriptionEntitlementService.ts`, `utils/age.ts`). Esta é a primeira vez
nesta revisão que o `typecheck` cobre a totalidade dos ficheiros tocados, e
não só um subconjunto — a ressalva da Fase 1 sobre verificação parcial
deixa de se aplicar.

Continua a faltar: `npm test`, `npm run build` e `npm run beta:gate` reais
(precisam de Postgres/Redis, indisponíveis neste sandbox) — recomendo
correres estes três no teu ambiente antes de mergear.

---

## 6. Confirmações pedidas na secção 23 do pedido original

- **Pagamentos live não activados**: confirmado — nenhuma alteração tocou
  em `NODE_ENV=production`'s Stripe guards (continuam a exigir chaves reais
  configuradas manualmente; nada nesta sessão liga Stripe live
  automaticamente).
- **Nenhuma chave/segredo commitado**: confirmado — todas as referências a
  `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/preços continuam a vir de
  `process.env`, nada hardcoded.
- **Bloqueio, denúncia, consentimento e revogação básica continuam
  gratuitos**: confirmado por construção — nenhum destes passa por
  `hasEntitlement` nem por qualquer novo gate desta sessão; o único gate
  novo tocado foi Modo Invisível (correctamente comercial) e o limiar de
  score em pedidos de ligação (que a própria secção 3 do pedido define como
  regra comercial, não de segurança).

---

## Ficheiros alterados/criados (Fases 1+2)

**Novos:**
- `server/src/lib/subscriptionEntitlementService.ts`
- `server/src/utils/age.ts`

**Alterados:**
- `server/src/lib/discoveryService.ts` (`buildScoreInput` exportado; secção
  10: `DiscoveryFilters` avançados + `applyAdvancedFilters`, Step 1.5)
- `server/src/lib/matchService.ts` (gate de score no `createLikeOrMatch`)
- `server/src/routes/discovery.ts` (mapeia `MIN_COMPATIBILITY_REQUIRED` →
  403; secção 10: parsing/gate de filtros avançados,
  `appliedFilters`/`ignoredFilters` na resposta)
- `server/src/routes/couples.ts` (mapeia `MIN_COMPATIBILITY_REQUIRED` → 403)
- `server/src/routes/privacy.ts` (Modo Invisível via `hasEntitlement`)
- `server/src/routes/subscriptions.ts` (`/plans` enriquecido, `checkoutUrl`,
  validação de elegibilidade no checkout, `/portal` novo, `/cancel`
  corrigido)
- `server/src/routes/webhooks.ts` (`currentPeriodEnd` real da Stripe,
  validação dupla de `COUPLE_PREMIUM`)
- `server/src/routes/matches.ts` (secção 4/5: `pending-requests` devolve
  `preview`/`full` consoante o plano, corrige exposição de foto não
  filtrada por política de acesso)
- `server/src/routes/contacts.ts` (secção 7: gate `CONTACT_BLOCKING` em
  `POST /block`)
- `server/src/routes/photos.ts` (secção 8: corrige anti-padrão de plano no
  cap de pedidos de acesso a fotos)
- `server/src/routes/travel.ts` (secção 9: gate `TRAVEL_MODE` em
  `POST /`)
- `client/src/pages/PremiumPage.jsx` (terminologia, bug `colors.lavender`,
  filtragem por elegibilidade real)
- `client/src/screens/MatchesScreen.jsx` (secção 4/5: consome
  `preview`/`full`, CTA de upsell para FREE)

**Migrations**: nenhuma nas Fases 1+2 — tudo o que foi implementado usa
campos já existentes no schema. A Fase 3D (secção 7 abaixo) acrescentou uma
única migration aditiva (`homeLocationUpdatedAt`) — nunca lat/lng/raio, por
decisão explícita do pedido Fase 3D.

---

## 7. Fase 3D — Travel Mode por país/cidade, sem georreferenciação

Implementa a diferenciação geográfica real do Travel Mode que tinha ficado
pendente no fim da Fase 2 (secções 3 e 4 acima) — mas **sem** latitude,
longitude, raio, ou qualquer fornecedor de geocoding, por instrução
explícita e não-negociável do pedido Fase 3D. Documentação funcional
completa em **`docs/product/TRAVEL_MODE.md`** — este é só o resumo de
estado; ver esse documento para o comportamento detalhado.

### O que foi feito

- **Schema**: um único campo novo, `Profile.homeLocationUpdatedAt`
  (`DateTime?`), migration aditiva pura
  (`20260716120000_add_home_location_updated_at`). Nenhum campo
  `homeCity`/`homeCountry`/`travelLat`/`travelLng` foi criado —
  `Profile.city`/`Profile.country` já eram a localização habitual, e
  `TravelMode.city`/`TravelMode.country` já existiam para o destino.
- **Novo serviço central**: `server/src/lib/effectiveLocationService.ts` —
  `getHomeLocation`, `getCurrentTravelMode`, `isTravelModeRelevantAt`,
  `getEffectiveLocation`, `normalizeCity`/`normalizeCountry`,
  `canChangeHomeLocation`.
- **Política de alteração da localização habitual** (nunca comercial —
  cooldown de dados, aplicável a todos os planos incluindo FREE): aplicada
  em `profiles.ts` nos 4 pontos onde `city`/`country` podem ser escritos.
- **Discovery**: `discoveryService.ts`'s `toScoreInput` passou a resolver a
  localização EFECTIVA (habitual ou destino do Travel Mode, se
  agendado/activo) em vez de ler `Profile.city`/`Profile.country`
  directamente; nova dimensão de ordenação `locationTier` (mesma cidade
  efectiva > mesmo país efectivo > resto), aplicada entre `premium` e
  `score` no Step 12, com o `Cursor` de paginação estendido para
  acompanhar.
- **`betweenScoreService.ts`**: `BetweenScoreProfileInput` ganhou `country`
  (bónus de 70 pontos para mesmo país efectivo, entre o bónus de 100 para
  mesma cidade e a aproximação por coordenadas de localização habitual,
  que continua completamente à parte de qualquer lógica de viagem).
- **`travel.ts`**: `GET /me` passou a devolver também `homeLocation`,
  `effectiveLocation`, e cada `TravelMode` anotado com `relevance`
  (`FUTURE`/`ACTIVE`/`EXPIRED`/`null`), tudo calculado no backend para o
  frontend nunca ter de reimplementar a lógica de datas.
- **`subscriptionEntitlementService.ts`**: corrigido o caso especial de
  `TRAVEL_MODE` — a versão da Fase 2 ainda deixava um perfil `GROUP` usar
  Travel Mode se um membro tivesse `PREMIUM`/`ELITE` pessoal; o pedido Fase
  3D é explícito ("GROUP nunca recebe Travel Mode", sem excepção) — corrigido
  para bloquear `GROUP` incondicionalmente, antes até de resolver planos.
- **Frontend**: `TravelModeSection.jsx` (novo componente partilhado,
  extraído do que antes só existia dentro de `CouplePage.jsx`) — usado por
  `CouplePage.jsx` (Travel Mode de casal, com aprovação) **e**
  `PrivacySettingsPage.jsx` (Travel Mode individual Premium, novo — antes
  não havia nenhuma superfície de UI para um indivíduo Premium activar
  Travel Mode). Textos "Vais estar em X entre..." (futuro) vs "Em Travel
  Mode em X até..." (activo) implementados exactamente como pedido, nunca
  "Estás em X" antes da data de início. `EditProfilePage.jsx` ganhou um
  campo de país (só existia o de cidade antes, apesar de `country` já ser
  gravado) e uma nota sobre o cooldown.

### Conhecido e documentado, não escondido

- **País ainda não é ISO2**: o pedido pedia país sempre por código ISO; o
  frontend actual usa texto livre (`"Portugal"`). Corrigir isto a meio,
  sem mudar o frontend para uma selecção controlada de país, partiria
  perfis existentes — por isso `normalizeCountry` só normaliza
  maiúsculas/trim, sem validar ISO2. Documentado como lacuna conhecida em
  `TRAVEL_MODE.md`, não como "feito".
- **`client/src/pages/TravelPage.jsx`** é código órfão (não roteado em
  `App.jsx`), a apontar para uma forma antiga e incompatível da API. Não
  foi tocado nem ligado — fica registado para remoção/substituição numa
  próxima sessão, para não haver duas implementações de Travel Mode no
  cliente.
- **Sem instância de Postgres/Redis** neste sandbox (mesma limitação já
  registada nas Fases 1+2): o fluxo de aprovação de casal e o efeito real
  no ranking do Discovery não foram exercitados ponta-a-ponta contra dados
  reais — só verificados por leitura de código e por `tsc`/`esbuild`.

### Verificação

`npx tsc --noEmit -p tsconfig.json` sobre o projecto de servidor inteiro
(reconstruído via Read tool numa cópia isolada, pelo mesmo motivo de
sincronização atrasada do fuse-mount já registado na secção 5): **0
erros**, cobrindo todos os ficheiros tocados na Fase 3D
(`effectiveLocationService.ts`, `discoveryService.ts`,
`betweenScoreService.ts`, `subscriptionEntitlementService.ts`,
`travel.ts`, `profiles.ts`) em conjunto com tudo o que já estava verificado
das Fases 1+2. `npx esbuild` (sintaxe, sem resolução de módulos) sobre os 4
ficheiros de frontend tocados (`CouplePage.jsx`, `EditProfilePage.jsx`,
`PrivacySettingsPage.jsx`, `TravelModeSection.jsx`): 0 erros.

Continua a faltar, tal como nas Fases 1+2: `npm test`, `npm run build`,
`npm run beta:gate`, e um `vite build` real do cliente — todos precisam de
infraestrutura (Postgres/Redis, e no caso do Vite build, resolução real de
módulos) indisponível neste sandbox.

### Ficheiros alterados/criados (Fase 3D)

**Novos:**
- `server/src/lib/effectiveLocationService.ts`
- `server/prisma/migrations/20260716120000_add_home_location_updated_at/migration.sql`
- `client/src/components/TravelModeSection.jsx`
- `docs/product/TRAVEL_MODE.md`

**Alterados:**
- `server/prisma/schema.prisma` (`Profile.homeLocationUpdatedAt`)
- `server/src/routes/profiles.ts` (cooldown de localização habitual em 4
  pontos de escrita)
- `server/src/lib/discoveryService.ts` (localização efectiva em
  `toScoreInput`, `locationTier` na ordenação e no cursor)
- `server/src/lib/betweenScoreService.ts` (`country` em
  `BetweenScoreProfileInput`, bónus de país no `baseLocationScore`)
- `server/src/routes/travel.ts` (`homeLocation`/`effectiveLocation`/
  `relevance` nas respostas)
- `server/src/lib/subscriptionEntitlementService.ts` (GROUP bloqueado
  incondicionalmente para `TRAVEL_MODE`)
- `client/src/pages/CouplePage.jsx` (Travel Mode extraído para o
  componente partilhado, textos de relevância)
- `client/src/pages/PrivacySettingsPage.jsx` (nova secção de Travel Mode
  individual)
- `client/src/pages/EditProfilePage.jsx` (campo de país, nota de cooldown)
