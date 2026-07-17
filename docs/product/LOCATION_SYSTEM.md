# Sistema de Localidades (GeoNames) — Arquitectura

> Estado: implementado nesta sessão. Verificação `tsc`/`esbuild`/testes ainda por correr —
> ver o relatório final da sessão para o resultado exacto. Nenhum import real foi executado
> neste ambiente (sandbox sem acesso de rede a `download.geonames.org` — ver
> `GEONAMES_IMPORT.md`), pelo que o catálogo `geo_locations` está vazio em qualquer base de
> dados que só tenha corrido as migrations desta sessão.

## Princípios inegociáveis

Estes princípios vieram explícitos no pedido original e não são negociáveis por nenhuma
implementação futura desta funcionalidade:

- **Nunca GPS do utilizador.** Não existe, em lado nenhum, um pedido de permissão de
  localização do browser/dispositivo.
- **Nunca recolha de localização em tempo real.** Nenhum endpoint aceita coordenadas vindas
  do cliente para gravar como posição de alguém.
- **Nunca geocoding em runtime.** Não há chamada a Google Maps, Mapbox, OpenCage, Nominatim
  ou equivalente a converter texto→coordenadas durante o uso normal da aplicação. A única
  fonte de coordenadas é o catálogo interno, pré-carregado a partir do GeoNames.
- **Nunca uma API paga de mapas em runtime.** O catálogo é uma tabela na própria base de
  dados (`geo_locations`), preenchida por um script de import batch — nunca uma chamada de
  rede por pedido de utilizador.
- **A localidade de referência é obrigatória para ligar um perfil ao catálogo.** Uma
  localidade "manual"/customizada nunca substitui a localidade de referência — é sempre um
  campo de apresentação à parte (ver secção "Localidade específica" abaixo).
- **Coordenadas nunca vão para o frontend sem necessidade.** A API pública de pesquisa
  (`/api/locations/*`) nunca devolve `latitude`/`longitude` — só `id`, `name`, `countryCode`,
  `admin1Name`/`admin2Name` e um `label` já composto.
- **Distâncias mostradas a um utilizador são sempre por escalão, nunca exactas** (ver secção
  "Distância aproximada").
- **Dados antigos nunca são apagados.** `Profile.city`/`Profile.country` e
  `TravelMode.city`/`TravelMode.country` continuam a existir e a ser aceites — o catálogo é
  aditivo, nunca uma migração destrutiva.
- **Nunca resolver ambiguidade sozinho.** Quando um script de migração encontra mais do que
  uma localidade candidata com o mesmo nome no mesmo país, o perfil fica marcado como
  ambíguo e é deixado para correcção manual de um admin — nunca uma escolha automática.

## Fonte de dados: GeoNames

- **Fonte:** [download.geonames.org/export/dump](https://download.geonames.org/export/dump/)
  — dump por país (`{PAIS}.zip`, ex. `PT.zip`), formato descrito em `readme.txt` do próprio
  GeoNames (19 colunas separadas por tab, sem cabeçalho).
- **Licença:** Creative Commons Attribution 4.0 (CC BY 4.0). Atribuição obrigatória —
  incluída em `GEONAMES_IMPORT.md`.
- **Import inicial:** só Portugal (`PT`). O script (`geo:import`) aceita qualquer código de
  país suportado pelo GeoNames — expandir para outros países é só correr o mesmo script com
  `--country=ES`, etc., sem alterações de código.
- **Feature codes incluídos** (allowlist, `INCLUDED_FEATURE_CODES` em `importGeoNames.ts`):
  `PPLC, PPLA, PPLA2, PPLA3, PPLA4, PPL, PPLX, PPLL, PPLS` — todos "populated place"
  (`featureClass === 'P'`). Variantes históricas/abandonadas (`PPLH`, `PPLQ`, `PPLW`,
  `PPLF`) ficam de fora por omissão da allowlist, nunca por uma denylist a manter.

## Modelo de dados

### `GeoLocation` (tabela `geo_locations`, nova)

```prisma
model GeoLocation {
  id             String   @id @default(cuid())
  geonamesId     Int      @unique
  countryCode    String
  name           String
  normalizedName String
  asciiName      String?
  alternateNames String?
  latitude       Float
  longitude      Float
  featureClass   String
  featureCode    String?
  population     BigInt?
  admin1Code     String?
  admin2Code     String?
  admin1Name     String?
  admin2Name     String?
  timezone       String?
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

Decisões de modelação:

- **`Float` para latitude/longitude**, não `Decimal` — consistente com o par pré-existente
  `Profile.locationLat`/`locationLng` (Fase 3D), evitando dois padrões de precisão numérica
  no mesmo schema.
- **Sem tabela `GeoLocationAlias` separada.** O dump principal do GeoNames já traz uma
  coluna `alternatenames` (lista separada por vírgulas) suficiente para o âmbito actual
  (Portugal). A tabela `alternateNamesV2` completa do GeoNames é maior e mais complexa do
  que o necessário para já — pode ser adoptada mais tarde se a pesquisa por alias se
  revelar insuficiente.
- **`geonamesId` único** — a chave de idempotência do import (`upsert` por `geonamesId`,
  nunca duplica ao correr o import outra vez).
- **`active`**, nunca apagar. Uma localidade desactivada (por um admin, ou por
  `--replace` deixar de aparecer na fonte) sai da pesquisa/import futuro mas mantém
  qualquer FK que já aponte para ela — apagar partiria `Profile.homeLocationId`/
  `TravelMode.destinationLocationId` de utilizadores reais.

### Alterações a `Profile`

```prisma
homeLocationId     String?
homeLocation       GeoLocation? @relation(fields: [homeLocationId], references: [id])
customLocality     String?
locationVisibility ProfileLocationVisibility @default(REFERENCE_LOCALITY)
```

`enum ProfileLocationVisibility { CUSTOM_LOCALITY, REFERENCE_LOCALITY, REGION_ONLY }`

- **`homeLocationId`** — a localidade de referência, do catálogo. `null` para um perfil
  ainda não migrado/sem catálogo (comportamento idêntico ao legacy, ver secção
  "Compatibilidade").
- **`customLocality`** — texto livre, só apresentação (ex.: "Bairro Alto", "zona da
  Sé"). **Nunca usado para calcular distância** — só entra no rótulo mostrado quando
  `locationVisibility === 'CUSTOM_LOCALITY'`.
- **`locationVisibility`** — o que é mostrado no perfil de outros utilizadores:
  - `REFERENCE_LOCALITY` (default) — o nome oficial da localidade catalogada (ex.:
    "Benedita").
  - `CUSTOM_LOCALITY` — `customLocality`, com fallback para o nome da localidade se estiver
    vazio.
  - `REGION_ONLY` — só o distrito/região (ex.: "Distrito de Leiria"), para quem quer menos
    granularidade.

`Profile.city`/`Profile.country` (Fase 3D, texto livre) continuam a existir sem alteração.

### Alterações a `TravelMode`

```prisma
destinationLocationId     String?
destinationLocation       GeoLocation? @relation(fields: [destinationLocationId], references: [id])
customDestinationLocality String?
```

Mesmo padrão de `Profile`, aplicado ao destino de uma viagem em vez da localização
habitual. `TravelMode.city`/`TravelMode.country` (Fase 3D) continuam a existir.

### Migration

`server/prisma/migrations/20260716140000_add_geo_locations/migration.sql` — puramente
aditiva: `CREATE TYPE`, `CREATE TABLE geo_locations` (+ 3 índices + índice único em
`geonamesId`), `ALTER TABLE profiles ADD COLUMN` (3 colunas + índice + FK
`ON DELETE SET NULL`), `ALTER TABLE travel_modes ADD COLUMN` (2 colunas + índice + FK
`ON DELETE SET NULL`). Nenhuma coluna existente é alterada ou removida.

## API pública (`/api/locations`)

Todas as rotas exigem sessão (`requireAuth`), sem permissão especial — o rate limit vem do
`globalLimiter` já montado globalmente em `/api`.

| Rota | Descrição |
|---|---|
| `GET /api/locations/countries` | Países com pelo menos uma localidade activa no catálogo (construído a partir dos dados reais, nunca uma lista estática). |
| `GET /api/locations/search?country=PT&q=bene&limit=20` | Pesquisa por prefixo (mín. 2 caracteres). Ordena: correspondência exacta → prefixo → população desc → nome. Nunca devolve latitude/longitude. |
| `GET /api/locations/:id` | Detalhe de uma localidade (usado para confirmar uma selecção do autocomplete). |

Resposta de cada localidade: `{ id, name, countryCode, admin1Name, admin2Name, label }` —
`label` já composto por `locationNormalizationService.buildLocationLabel` (ex.: `"Benedita —
Alcobaça, Leiria, Portugal"`).

### Admin (`requireAdmin('catalog')`)

| Rota | Descrição |
|---|---|
| `GET /api/locations/admin/search` | Como `/search`, sem mínimo de caracteres, inclui localidades desactivadas. |
| `GET /api/locations/admin/profiles-without-reference` | Perfis ainda sem `homeLocationId`. |
| `PUT /api/locations/admin/profiles/:id/location` | Corrige manualmente a localidade de referência de um perfil (ignora o cooldown — é uma correcção administrativa, não uma mudança pedida pelo utilizador). |
| `PUT /api/locations/admin/:id/deactivate` | Desactiva uma localidade inválida (nunca apaga). |

UI correspondente: `client/src/pages/AdminPage.jsx` → Configurações → subtab
**Localidades** (`LocationsManager`).

## Localidade específica (customLocality)

Um campo de texto livre, opcional, sempre associado (ou não) a uma localidade de
referência — nunca um substituto dela. Serve para uma granularidade que o catálogo GeoNames
não cobre bem a nível de "populated place" (bairro, zona). Nunca entra em nenhum cálculo de
distância ou comparação de compatibilidade — só na composição do rótulo mostrado
(`resolveDisplayLabel`, `effectiveLocationService.ts`), e só quando
`locationVisibility === 'CUSTOM_LOCALITY'`.

## Distância aproximada e escalões de apresentação

`server/src/lib/distanceService.ts`:

- `calculateDistanceKm(a, b)` — Haversine exacta (reutiliza `utils/location.ts#haversineKm`,
  nunca uma segunda implementação da fórmula). Uso interno apenas (filtros, ordenação,
  Between Score) — nunca devolvida directamente a um cliente.
- `roundDistanceForDisplay(km)` — arredondamento por magnitude (unidades <10km, múltiplos de
  5 até 100km, múltiplos de 25 depois), para nunca sugerir mais precisão do que a fonte tem.
- `getDistanceBucket(km)` — os escalões recomendados pelo pedido original, os únicos que
  devem chegar à interface quando se mostra distância a **outro** utilizador:

  | Escalão | Texto |
  |---|---|
  | `0-10` | menos de 10 km |
  | `10-25` | cerca de 10–25 km |
  | `25-50` | cerca de 25–50 km |
  | `50-100` | cerca de 50–100 km |
  | `100-250` | cerca de 100–250 km |
  | `250+` | mais de 250 km |

Nunca "17,36 km" — esse é exactamente o exemplo que o pedido original deu do que não fazer.

## Cooldown de alteração da localização habitual

Estende a política já existente da Fase 3D (`effectiveLocationService.ts#
canChangeHomeLocation`) para também cobrir `homeLocationId`, sem duplicar a função:

- Quando o chamador passa `homeLocationId` (fluxo novo), a mudança real é decidida por
  **comparação de id**, nunca por nome — duas localidades chamadas "São Pedro" em distritos
  diferentes têm ids diferentes e são uma mudança real, mesmo que o texto coincida
  (a comparação de string antiga teria dado um falso "sem mudança" neste caso).
- Continua a valer para **todos os planos**, incluindo PREMIUM — não é uma gate comercial,
  nunca pode ser paga para saltar (mesmo princípio da Fase 3D, agora reafirmado
  explicitamente pelo pedido do sistema de localidades).
- Resposta de bloqueio: `403 { error, code: 'LOCATION_CHANGE_COOLDOWN', nextAllowedAt }`.
  (Nome do código actualizado nesta sessão — a Fase 3D usava
  `HOME_LOCATION_COOLDOWN_ACTIVE`; nada no frontend lia esse `code` programaticamente, só o
  `error` de texto livre, por isso a mudança de nome é segura.)
- Aplicado em `routes/profiles.ts`: `PUT /me`, `PUT /:id`, `POST /` (ramo de actualização),
  e o arranque do relógio em `PUT /onboarding/step` (agora também dispara quando o perfil
  tem `homeLocationId`, não só quando tem `city`/`country`).

## Integração com Discovery e Between Score

`discoveryService.ts` e `betweenScoreService.ts` foram estendidos, nunca substituídos:

- `BetweenScoreProfileInput` ganhou `locationId`/`coordinates` opcionais, ao lado dos
  campos legacy `city`/`country`/`locationLat`/`locationLng` já existentes.
- `baseLocationScore` (em `betweenScoreService.ts`) prioriza, por esta ordem: **1)** mesma
  `locationId` → 100; **2)** `locationId` diferente mas ambos com coordenadas do catálogo →
  distância real via Haversine, nos mesmos escalões de pontuação já usados para a
  aproximação legacy; **3)** fallback total para a lógica pré-existente (string de
  cidade/país, depois coordenadas coarse `locationLat`/`locationLng`, depois neutro). Um
  perfil que ainda não tem `homeLocationId` nunca é penalizado — cai simplesmente no
  fallback legacy, exactamente como antes desta funcionalidade existir.
- `discoveryService.ts#resolveEffectiveLocationFromProfile` (e, por extensão,
  `toScoreInput`) agora também resolve `locationId`/`coordinates` da localização efectiva
  (destino de Travel Mode se `FUTURE`/`ACTIVE`, senão a habitual) via
  `GEO_LOCATION_SELECT`/`deriveTravelModeLocation`, ambos exportados de
  `effectiveLocationService.ts` para nunca duplicar essa árvore de decisão entre ficheiros.
- `locationTierFor` (ordenação Step 12 do pipeline) também prioriza `locationId`: mesma
  localidade catalogada → tier 0 (nunca por nome, pela mesma razão de "São Pedro" acima).
- `filterPoolByDistance` (filtro avançado `maxDistanceKm`, secção 10 do pedido de
  monetização) usa as coordenadas da localização **efectiva** do catálogo quando
  disponíveis (viagem-aware), com fallback para as coordenadas coarse legacy de
  `Profile.locationLat`/`locationLng` (que nunca reflectem Travel Mode).
- **Between Score nunca é inflacionado por Premium** — princípio reafirmado, inalterado por
  esta funcionalidade. Premium continua a ser só uma dimensão de ordenação separada (Step
  11.5), nunca um input do próprio score.

## Travel Mode: destino do catálogo

`routes/travel.ts` (`POST /api/travel`) aceita `destinationLocationId` +
`customDestinationLocality`, ao lado de `city`/`country` legacy — pelo menos um dos dois
(`destinationLocationId` ou `city`) é exigido. Quando `destinationLocationId` é dado, é
validado contra o catálogo (existe + `active`) antes de criar a janela de viagem.

`GET /api/travel/me` devolve cada `TravelMode` já anotado com `location` (id/país/rótulo
derivados, nunca coordenadas — ver `withoutCoordinates`/`toPublicEffectiveLocation` em
`effectiveLocationService.ts`), e `homeLocation`/`effectiveLocation` do próprio pedido
também passam pelo mesmo filtro antes de saírem para o cliente.

## Compatibilidade com dados legacy

Nada obriga um perfil a adoptar o catálogo. Em todos os pontos de leitura
(`getHomeLocation`, `getCurrentTravelMode`, `getEffectiveLocation`, Discovery, Between
Score), a ausência de `homeLocationId`/`destinationLocationId` cai automaticamente no
comportamento legacy da Fase 3D (comparação de string `city`/`country`, coordenadas coarse
`locationLat`/`locationLng`) — sem excepções nem casos especiais adicionais no chamador.

## Migração de perfis existentes

Dois scripts, só leitura o primeiro, escrita opcional o segundo — nunca automáticos, nunca
correm em produção sem serem invocados explicitamente:

- `npm run geo:audit-profiles` — conta perfis com/sem `homeLocationId`, distribuição do
  `country` legacy, tamanho do catálogo. Nunca escreve.
- `npm run geo:map-profiles -- --dry-run` (depois, sem `--dry-run` para aplicar) — tenta
  ligar `city`/`country` legacy a uma entrada do catálogo por correspondência exacta de
  nome normalizado, **nunca resolvendo ambiguidade sozinho** (mais de uma localidade
  candidata → fica marcado como ambíguo, nunca escolhido). Nunca escreve
  `homeLocationUpdatedAt` — ligar um perfil ao catálogo não é uma mudança de localização
  pedida pelo utilizador, não deve reiniciar o cooldown. Ver detalhe em
  `server/src/scripts/geoMapProfiles.ts`.

Casos ambíguos e sem correspondência ficam para o admin resolver manualmente
(Configurações → Localidades, ver secção "Admin" acima).

## Privacidade

- Nenhuma rota (pública ou admin) devolve latitude/longitude a um cliente, excepto os
  próprios dados internos do catálogo consultados directamente na base de dados (nunca via
  API).
- `GET /api/profiles/me`/`GET /api/profiles/:id` devolvem só `homeLocationLabel` (texto já
  resolvido), nunca `homeLocationId` em bruto no caso do perfil de outra pessoa (removido
  explicitamente da resposta pública).
- `GET /api/travel/me` passa `homeLocation`/`effectiveLocation`/cada `TravelMode` por
  `withoutCoordinates`/`toPublicEffectiveLocation` antes de responder.
- Nenhum GPS, endereço, hotel, ou coordenada exacta de utilizador é alguma vez recolhido ou
  mostrado — as únicas coordenadas que existem no sistema são o centro aproximado de uma
  localidade catalogada do GeoNames, nunca a posição real de ninguém.

## Ficheiros principais

| Ficheiro | Papel |
|---|---|
| `server/src/lib/locationNormalizationService.ts` | Normalização de nome/país, rótulos, tokens de pesquisa. |
| `server/src/lib/distanceService.ts` | Distância Haversine + arredondamento + escalões. |
| `server/src/lib/effectiveLocationService.ts` | Localização habitual/efectiva, cooldown, derivação de Travel Mode, remoção de coordenadas antes de responder. |
| `server/src/routes/locations.ts` | API pública + admin do catálogo. |
| `server/src/scripts/importGeoNames.ts` | Import do dump GeoNames. |
| `server/src/scripts/geoStats.ts` | Estatísticas do catálogo já importado. |
| `server/src/scripts/geoAuditProfiles.ts` | Auditoria (só leitura) de perfis. |
| `server/src/scripts/geoMapProfiles.ts` | Migração best-effort de perfis legacy → catálogo. |
| `client/src/components/LocationAutocomplete.jsx` | Componente partilhado de selecção (país → pesquisa → escolha obrigatória). |
| `client/src/pages/CreateProfilePage.jsx` | Onboarding — localização habitual (opcional). |
| `client/src/pages/EditProfilePage.jsx` | Edição de perfil — localização habitual + visibilidade. |
| `client/src/components/TravelModeSection.jsx` | Travel Mode — destino do catálogo. |
| `client/src/pages/AdminPage.jsx` | Configurações → Localidades (`LocationsManager`). |

Ver também `GEONAMES_IMPORT.md` (execução do import) e `TRAVEL_MODE.md` (Travel Mode em
detalhe, actualizado para reflectir o catálogo).
