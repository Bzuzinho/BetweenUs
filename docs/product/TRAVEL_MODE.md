# Travel Mode — Localização por País/Cidade (Fase 3D + Sistema de Localidades)

> Estado: Fase 3D implementada e verificada por `tsc` (servidor) e `esbuild` (cliente) em
> 2026-07-16. Nessa mesma data, o Sistema de Localidades (catálogo GeoNames) estendeu esta
> funcionalidade — ver `LOCATION_SYSTEM.md` para a arquitectura completa do catálogo; este
> documento cobre Travel Mode especificamente, actualizado para reflectir essa extensão.
> Sem base de dados/Redis disponível neste ambiente de desenvolvimento, pelo que os fluxos
> não foram exercitados ponta-a-ponta contra uma instância real — ver secção "Por confirmar".

## Princípio: sem georreferenciação em tempo real

O Travel Mode funciona com **país** e **cidade/localidade**, mais um intervalo de datas.
Nunca há um pedido de GPS ao dispositivo do utilizador, nunca geocoding em runtime, nunca
uma API paga de mapas chamada por pedido — a co-localização "mesma cidade" ou "mesmo país"
é sempre resolvida a partir de dados já carregados (comparação de strings normalizadas, ou,
desde o Sistema de Localidades, distância real entre duas localidades do catálogo GeoNames
— nunca a posição real de ninguém). Ver `LOCATION_SYSTEM.md` para os princípios completos.

Desde o Sistema de Localidades, o destino de uma viagem pode ser **destinationLocationId**
(uma localidade do catálogo, com coordenadas aproximadas do seu centro) em vez de só texto
livre `city`/`country` — ambos continuam aceites, ver secção "Destino do catálogo" abaixo.

O campo `Profile.locationLat`/`Profile.locationLng` (pré-existente, usado para a
aproximação de distância no Between Score quando não há cidade em comum) continua a
existir; o cálculo de distância real do Between Score agora prefere as coordenadas da
localização **efectiva** do catálogo (habitual ou destino de viagem) quando disponíveis,
com este par como fallback legacy — ver `LOCATION_SYSTEM.md#integração-com-discovery-e-between-score`.

## Localização habitual

A localização habitual de um perfil é `Profile.city` + `Profile.country` — os mesmos
campos que já existiam antes da Fase 3D. Não foram criados campos `homeCity`/`homeCountry`
separados: duplicar esses dados criaria dois sítios com a mesma verdade, um risco maior do
que o benefício de um nome mais explícito.

O que a Fase 3D acrescentou foi um único campo novo, `Profile.homeLocationUpdatedAt`
(`DateTime?`, nullable, migração aditiva pura — ver
`server/prisma/migrations/20260716120000_add_home_location_updated_at`), que regista
quando a localização habitual foi confirmada pela última vez fora do onboarding. É o
relógio da política de alteração descrita a seguir — nunca é lido para nada relacionado
com Discovery ou Between Score.

### Política de alteração (todos os planos, incluindo FREE)

A correcção da localização habitual **não é uma vantagem comercial** — é uma política de
integridade de dados que existe para impedir que alguém simule uma viagem mudando
repetidamente `city`/`country` do perfil em vez de usar o Travel Mode a sério. Por isso:

- **Nunca é paga.** Não há, nem pode haver, uma forma de pagar para saltar o cooldown.
- **Livre durante o onboarding.** Enquanto `Profile.status === 'DRAFT'` (antes do perfil
  estar aprovado/pendente de revisão), a cidade/país podem ser corrigidos sem restrição —
  a pessoa ainda está a preencher o perfil pela primeira vez.
- **Cooldown depois de confirmada.** Assim que o onboarding termina (último passo de
  `PUT /api/profiles/onboarding/step`), se já havia cidade ou país preenchidos,
  `homeLocationUpdatedAt` é carimbado com a data/hora nesse momento — essa é a
  "confirmação". A partir daí, qualquer alteração de `city`/`country` só é aceite depois
  de decorridos `HOME_LOCATION_COOLDOWN_DAYS` dias (variável de ambiente, default **90**).
- **Primeira alteração pós-onboarding é sempre livre** se `homeLocationUpdatedAt` ainda
  for `null` (perfis criados antes da Fase 3D, ou que terminaram o onboarding sem
  cidade/país preenchidos) — só depois dessa primeira confirmação é que o cooldown passa a
  contar.
- **Só conta se houver mudança real.** Uma gravação que mantém a mesma cidade/país
  (comparados já normalizados — ver secção seguinte) nunca consome nem verifica o
  cooldown.

Lógica central em `server/src/lib/effectiveLocationService.ts#canChangeHomeLocation`,
aplicada em `server/src/routes/profiles.ts` nos quatro pontos onde `city`/`country`
(ou, desde o Sistema de Localidades, `homeLocationId`) podem ser escritos: `PUT
/profiles/me`, `PUT /profiles/:id`, `POST /profiles` (ramo de actualização de perfil já
existente) e `PUT /profiles/onboarding/step` (o momento da confirmação inicial — agora
também dispara quando o perfil já tem `homeLocationId`, não só `city`/`country`). Quando
bloqueado, a API responde `403` com **`code: 'LOCATION_CHANGE_COOLDOWN'`** e
`nextAllowedAt` (data exacta a partir de quando a alteração volta a ser permitida) — o
frontend nunca calcula nem inventa essa data, só mostra o que o backend devolve no banner
de erro (`EditProfilePage.jsx`).
>
> **Nota de nomenclatura:** este código de erro chamava-se `HOME_LOCATION_COOLDOWN_ACTIVE`
> na Fase 3D original; foi renomeado para `LOCATION_CHANGE_COOLDOWN` quando o Sistema de
> Localidades passou a cobrir também `homeLocationId` (nome pedido explicitamente pela
> secção 12 desse pedido). Nada no frontend lia este `code` programaticamente — só o
> `error` de texto livre, que continua a vir do backend sem alteração de comportamento —
> por isso a mudança de nome não partiu nenhum fluxo existente.
>
> Quando o chamador passa `homeLocationId` (fluxo do catálogo), a mudança real é decidida
> por **comparação de id**, nunca por nome: duas localidades chamadas "São Pedro" em
> distritos diferentes têm ids diferentes e contam como uma mudança real, mesmo com texto
> igual — algo que a comparação de string antiga não conseguia distinguir.

## Travel Mode (Premium)

Um perfil **PREMIUM** (individual) ou **COUPLE_PREMIUM** (perfil de casal, com aprovação
dos dois membros) pode agendar temporariamente um destino — país + cidade/localidade,
mais data de início e de fim. O Travel Mode **nunca** altera a localização habitual: os
campos `Profile.city`/`Profile.country` continuam intocados durante e depois da viagem.

- **GROUP nunca tem acesso a Travel Mode**, mesmo que um membro tenha PREMIUM ou ELITE
  pessoal — Travel Mode só existe para contexto INDIVIDUAL ou COUPLE. Isto é verificado em
  `subscriptionEntitlementService.ts#hasEntitlement` (caso especial `'TRAVEL_MODE'`) antes
  de qualquer resolução de plano.
- **COUPLE_PREMIUM é um benefício do casal, não herdado por outro perfil.** Um utilizador
  que beneficia de COUPLE_PREMIUM através do seu casal não estende esse benefício a um
  perfil GROUP diferente do qual também seja membro — só PREMIUM/ELITE pessoal conta fora
  do contexto COUPLE.

### Fluxo individual

`POST /api/travel` cria a proposta e, para um perfil INDIVIDUAL (um único membro activo),
activa-a imediatamente: `status: 'SCHEDULED'`, `active: true`.

### Fluxo de casal (aprovação dupla)

Para um perfil COUPLE (ou GROUP, embora GROUP nunca passe pela gate de entitlement acima),
a proposta entra em `status: 'WAITING_MEMBER_APPROVAL'` (`active: false`) e só passa a
`SCHEDULED`/`active: true` quando **todos** os membros activos aprovarem
(`POST /api/travel/:id/approve`, via `approvalPolicyService.isApprovalSatisfied` — a mesma
máquina de aprovação ALL/MAJORITY/DESIGNATED já usada no double-consent de matches). Só
pode existir uma proposta `WAITING_MEMBER_APPROVAL`/`SCHEDULED` de cada vez por perfil —
uma nova substitui (cancela) a anterior.

### Destino do catálogo (Sistema de Localidades)

`POST /api/travel` aceita `destinationLocationId` (uma localidade do catálogo GeoNames) +
`customDestinationLocality` (texto livre, só apresentação), a par de `city`/`country`
legacy — pelo menos um dos dois (`destinationLocationId` ou `city`) é exigido. Quando
`destinationLocationId` é dado, é validado (existe + `active`) antes de criar a janela de
viagem. `GET /api/travel/me` devolve cada `TravelMode` já com `location` (id/país/rótulo já
derivados, nunca coordenadas). `client/src/components/TravelModeSection.jsx` usa
`LocationAutocomplete.jsx` para esta selecção — mesmo componente do onboarding/edição de
perfil.

## Estados temporais: futuro, ativo, expirado

Não existe nenhum cron job a actualizar `TravelMode.status`/`active` quando as datas
passam — a relevância temporal é **sempre calculada em tempo de leitura**, nunca escrita
de volta. Isto é feito por
`effectiveLocationService.ts#isTravelModeRelevantAt(travel, atDate)`:

| Relevância | Condição | Comportamento |
|---|---|---|
| `FUTURE` | `atDate < startDate` | Já pode ser usado para aparecer no Discovery do destino, mas a UI nunca pode afirmar presença física — só "vais estar". |
| `ACTIVE` | `startDate <= atDate <= endDate` | É a localização efectiva plena — Discovery e Between Score usam o destino. |
| `EXPIRED` | `atDate > endDate` | Deixa de contar para tudo; a localização efectiva volta a ser a habitual sem qualquer escrita adicional (nunca havia sido substituída, só "sobreposta" em tempo de leitura). |
| Cancelado | `TravelMode.status === 'CANCELLED'` | Nunca é devolvido por `getCurrentTravelMode` — cai directamente no caso "sem Travel Mode", localização habitual. |

`getEffectiveLocation(profileId, atDate?)` é o ponto único que resolve "qual é a
localização efectiva deste perfil agora" — nunca ler `Profile.city`/`Profile.country`
directamente quando o que se quer é a localização efectiva (a única excepção legítima é o
próprio `getHomeLocation`, que por definição lê sempre a habitual).

## Normalização de cidade e país

Nunca se compara strings de localização em bruto. `effectiveLocationService.ts` expõe:

- `normalizeCity(city)` — trim, minúsculas, remoção de acentos (NFD + remoção de marcas
  diacríticas U+0300–U+036F), colapso de espaços. `"Porto"`, `" porto "` e `"PORTO"`
  normalizam todos para `"porto"`.
- `normalizeCountry(country)` — trim, maiúsculas.

O valor de apresentação original (`city`) nunca é alterado por esta normalização — só a
versão normalizada, devolvida à parte (`cityNormalized`), é usada em comparações de
igualdade (Discovery, Between Score, aprovação de mesma-cidade).

**Lacuna da Fase 3D, agora resolvida para perfis que adoptam o catálogo:** o pedido
original da Fase 3D pedia país sempre por código ISO, mas o frontend legacy
(`Profile.country`, `TravelMode.country`) continua texto livre (ex.: `"Portugal"`, sem
validação ISO2) — `normalizeCountry` só normaliza maiúsculas/trim, nunca converteu texto
livre para ISO2. **O Sistema de Localidades resolve isto para quem usa
`homeLocationId`/`destinationLocationId`:** `GeoLocation.countryCode` é sempre um código
ISO2 real (vem directamente da coluna `country code` do GeoNames), e
`LocationAutocomplete.jsx` só permite escolher um país através de um `<select>` alimentado
por `GET /api/locations/countries` — nunca texto livre. Um perfil que ainda não migrou para
o catálogo continua sujeito à lacuna original (duas variantes do mesmo país com
capitalização diferente comparam como iguais, mas `"Portugal"` vs `"PT"` não) —
`server/src/scripts/geoMapProfiles.ts` usa
`locationNormalizationService.ts#countryCodeForName` para tentar resolver os casos legacy
mais comuns automaticamente (nomes conhecidos de país, nunca uma adivinhação), mas não
cobre variantes desconhecidas.

## Discovery: prioridade de localização

O pipeline de Discovery (`discoveryService.ts`) já não lê `Profile.city`/`Profile.country`
directamente para scoring — `toScoreInput` resolve a localização efectiva de cada perfil
(via `resolveEffectiveLocationFromProfile`, uma reimplementação em memória das mesmas
regras de `effectiveLocationService`, para não fazer uma query extra por candidato) antes
de alimentar o Between Score.

A ordenação final (Step 12) segue: **premium** (desc) → **`locationTier`** (asc: 0 = mesma
localidade efectiva, 1 = mesmo país efectivo, 2 = resto) → **score** (desc) → `createdAt`
(desc) → `id` (asc). `locationTier` é uma dimensão de ordenação separada, tal como
`premium` — nunca infla o Between Score em si (o score continua a ser um sinal honesto de
compatibilidade, mostrado ao utilizador com razões explícitas). O cursor de paginação
(`Cursor`/`isAfterCursor`) foi estendido com este campo para a paginação continuar
consistente com a nova dimensão.

**Sistema de Localidades:** quando ambos os lados têm `locationId` (catálogo GeoNames),
"tier 0" passa a ser decidido por **igualdade de id**, não de nome — evita que duas
localidades homónimas em distritos diferentes (ex. duas freguesias "São Pedro") sejam
tratadas como a mesma cidade só por coincidência de texto. Perfis ainda sem catálogo caem
no comportamento legacy (comparação de string) sem qualquer penalização. O Between Score em
si (`baseLocationScore`) segue a mesma prioridade: mesma `locationId` → distância real entre
localidades do catálogo → fallback legacy — ver `LOCATION_SYSTEM.md`.

Se `travelCity` estiver vazio mas `travelCountry` estiver preenchido, a comparação cai
naturalmente para o nível de país (`locationTier === 1`) — não há um caso especial extra,
é só a ausência de `city` a fazer a primeira condição falhar.

## Privacidade

Nunca se mostra rua, morada, coordenadas exactas ou qualquer localização mais precisa do
que cidade/localidade + país. Isto é estrutural: nem o schema nem a API de Travel Mode têm
sequer um campo onde uma morada ou coordenada pudesse ser guardada.

## Textos de interface

`GET /api/travel/me` devolve `homeLocation`, `effectiveLocation`, e cada `TravelMode` da
lista anotado com `relevance` (`'FUTURE' | 'ACTIVE' | 'EXPIRED' | null`) — calculado no
backend, nunca no cliente, para nunca haver duas implementações da mesma lógica de datas a
divergir. Os textos usados (`client/src/components/TravelModeSection.jsx`, partilhado por
`CouplePage.jsx` e `PrivacySettingsPage.jsx`):

| Situação | Texto mostrado |
|---|---|
| Localização habitual | "Localização habitual: Benedita, Portugal" |
| Travel Mode agendado, `relevance: 'FUTURE'` | "Vais estar em Porto entre 10 de agosto e 14 de agosto." |
| Travel Mode activo, `relevance: 'ACTIVE'` | "Em Travel Mode em Porto até 14 de agosto." |
| Proposta ainda sem aprovação de todos | "⏳ A aguardar aprovação" |

Nunca se mostra "Estás no Porto" antes da data de início — essa frase implicaria presença
física que ainda não aconteceu.

## Superfícies de UI

- **`client/src/pages/CouplePage.jsx`** — Travel Mode do casal (requer aprovação de
  todos), visível quando `coupleStatus === 'ACTIVE'`.
- **`client/src/pages/PrivacySettingsPage.jsx`** — Travel Mode individual (Premium),
  activa de imediato, sem aprovação.
- **`client/src/components/TravelModeSection.jsx`** — componente partilhado pelos dois
  acima; a única diferença de comportamento entre os dois contextos vem inteiramente da
  API (o backend já sabe se o perfil activo é INDIVIDUAL ou COUPLE) — o componente nunca
  decide isso, só mostra o que a API devolve ou recusa. Desde o Sistema de Localidades, usa
  `LocationAutocomplete.jsx` para escolher o destino do catálogo.
- **`client/src/components/LocationAutocomplete.jsx`** — componente reutilizável de
  selecção de localidade (país → pesquisa ≥2 caracteres → escolha obrigatória do catálogo
  → campo opcional de localidade específica), partilhado por `CreateProfilePage.jsx`,
  `EditProfilePage.jsx` e `TravelModeSection.jsx`. Ver `LOCATION_SYSTEM.md`.
- **`client/src/pages/EditProfilePage.jsx`** — edição da localização habitual, agora via
  `LocationAutocomplete` (catálogo) em vez dos antigos campos de texto livre `city`/
  `country`, mais um select de `locationVisibility` (o que é mostrado no perfil). Nota
  visível sobre o cooldown e encaminhamento para o Travel Mode quando o que a pessoa quer é
  uma viagem temporária, não uma mudança de residência.
- **`client/src/pages/AdminPage.jsx`** — Configurações → subtab "Localidades"
  (`LocationsManager`): pesquisar/desactivar localidades do catálogo, corrigir manualmente
  a localidade de referência de um perfil.
- **`client/src/pages/TravelPage.jsx`** — ficheiro órfão, não usado por nenhuma rota
  (`App.jsx` não regista `/travel`), a apontar para uma forma antiga da API
  (`GET /travel` em vez de `GET /travel/me`, `res.data.travels` em vez de
  `travelModes`). Não foi actualizado nem ligado — recomenda-se removê-lo ou substituí-lo
  pela próxima vez que a página for tocada, para não haver duas implementações de Travel
  Mode no cliente.

## Por confirmar / testar

- Fluxo completo de aprovação de casal ponta-a-ponta contra uma base de dados real
  (`WAITING_MEMBER_APPROVAL` → `SCHEDULED` → aparecimento no Discovery do destino →
  expiração automática por data).
- Confirmar em produção que o `locationTier` de facto reordena resultados visivelmente
  quando há candidatos em Travel Mode na mesma cidade do que o viewer.
- ~~Decidir e implementar a validação ISO2 de país~~ — resolvido para perfis novos via o
  catálogo GeoNames (`GeoLocation.countryCode`); perfis legacy continuam sujeitos à lacuna
  original até serem migrados (`geo:map-profiles`) ou editados manualmente.
- **Import GeoNames nunca executado neste ambiente** (rede bloqueada para
  `download.geonames.org` — ver `GEONAMES_IMPORT.md`). Até alguém correr
  `npm run geo:import -- --country=PT` num ambiente com acesso de rede, `geo_locations`
  está vazia e `LocationAutocomplete.jsx`/`GET /api/locations/*` não devolvem resultados
  nenhuns — a UI degrada de forma segura (mostra "sem resultados", nunca rebenta), mas a
  funcionalidade só fica utilizável de facto depois do import correr.
- Testar `geo:map-profiles` contra dados reais de produção (perfis com `country` em texto
  livre variado) para confirmar a taxa real de correspondência automática vs. ambígua vs.
  sem país reconhecível.
