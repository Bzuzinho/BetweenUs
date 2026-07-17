// Fase 3D — Travel Mode baseado em país/cidade — e, agora, sistema de
// localidades GeoNames (catálogo interno GeoLocation).
//
// Serviço central que decide "onde é que este perfil está, para efeitos de
// Discovery, Between Score e apresentação". Nunca GPS do utilizador, nunca
// geocoding em runtime — as coordenadas aqui usadas são sempre o centro
// aproximado de uma localidade catalogada (GeoLocation.latitude/longitude,
// importadas do GeoNames — ver docs/product/GEONAMES_IMPORT.md), nunca a
// posição real de ninguém.
//
// Compatibilidade: um perfil pode ter `homeLocationId` (novo, aponta para
// GeoLocation) ou só `city`/`country` em texto livre (legacy, Fase 3D e
// anterior). Esta função nunca obriga a migração — quando homeLocationId
// é null, cai-se sempre em fallback para city/country, exactamente como
// antes desta funcionalidade. O mesmo vale para TravelMode.destinationLocationId
// vs city/country. Todas as rotas que precisem de decidir "qual é a
// localização efectiva de um perfil neste momento" devem chamar para aqui,
// nunca ler Profile.city/Profile.country/Profile.homeLocationId
// directamente para esse fim (ver discoveryService.ts).
import prisma from './prisma'
import { normalizeLocationName, normalizeCountryCode, buildLocationLabel, type LocationLabelInput } from './locationNormalizationService'

export interface GeoCoordinates {
  latitude: number
  longitude: number
}

export interface HomeLocation {
  // Legado (Fase 3D) — sempre preenchido, mesmo quando o perfil já usa o
  // catálogo: quando há homeLocationId, city/country aqui reflectem o
  // nome/país da GeoLocation (não o texto livre antigo, que pode nem
  // existir), precisamente para que comparações de string já existentes
  // (Discovery locationTier, betweenScoreService.baseLocationScore)
  // continuem a funcionar sem duplicar lógica por dois caminhos.
  country: string | null       // código ISO2, normalizado (maiúsculas)
  city: string | null          // valor de apresentação, tal como guardado
  cityNormalized: string | null // valor normalizado, só para comparação
  // Sistema de localidades (novo) — null para perfis ainda sem
  // homeLocationId (legacy).
  locationId: string | null
  coordinates: GeoCoordinates | null
  // Rótulo pronto a mostrar no perfil, já a respeitar
  // Profile.locationVisibility (CUSTOM_LOCALITY/REFERENCE_LOCALITY/
  // REGION_ONLY — secção 13 do pedido). Nunca coordenadas, nunca mais
  // detalhe do que a localidade/distrito escolhidos.
  displayLabel: string | null
}

export type TravelRelevance = 'FUTURE' | 'ACTIVE' | 'EXPIRED' | null

export interface CurrentTravelMode {
  id: string
  profileId: string
  country: string | null
  city: string | null
  cityNormalized: string | null
  startDate: Date
  endDate: Date
  status: string
  locationId: string | null
  coordinates: GeoCoordinates | null
  displayLabel: string | null
}

export type EffectiveLocationSource = 'HOME' | 'TRAVEL_FUTURE' | 'TRAVEL_ACTIVE'

export interface EffectiveLocation {
  country: string | null
  city: string | null
  cityNormalized: string | null
  locationId: string | null
  coordinates: GeoCoordinates | null
  displayLabel: string | null
  source: EffectiveLocationSource
  travelMode: CurrentTravelMode | null
}

// ── Normalização (secção 9 do pedido Fase 3D / secção 8 do pedido de
// localidades) ─────────────────────────────────────────────────────────
// Nunca comparar strings de localização sem tratamento: trim, minúsculas,
// remoção de acentos para a cidade; país sempre por código ISO (maiúsculas,
// trim). O valor de apresentação original nunca é alterado — só a versão
// normalizada, devolvida à parte, é usada em comparações de igualdade.
// Delegam para locationNormalizationService.ts (mesmo algoritmo, um único
// sítio de verdade), partilhado também pelo catálogo GeoLocation (script
// de importação, API de pesquisa). Mantidas aqui, com o mesmo nome e
// assinatura (`string | null` em vez de `string`, devolvendo null em vez
// de string vazia), para não obrigar a tocar em todos os chamadores já
// existentes (discoveryService.ts, betweenScoreService.ts comments,
// profiles.ts, travel.ts) que continuam a importar
// normalizeCity/normalizeCountry DESTE ficheiro.
export const normalizeCity = (city?: string | null): string | null => {
  const normalized = normalizeLocationName(city)
  return normalized || null
}

export const normalizeCountry = (country?: string | null): string | null => {
  const normalized = normalizeCountryCode(country)
  return normalized || null
}

export const normalizeLocation = (
  country?: string | null, city?: string | null
): { country: string | null; cityNormalized: string | null } => ({
  country: normalizeCountry(country),
  cityNormalized: normalizeCity(city),
})

// Select mínimo de GeoLocation necessário para resolver localização
// efectiva — nunca inclui campos não usados aqui (population, timezone,
// alternateNames, etc.), e sobretudo nunca é devolvido tal-e-qual a uma
// rota pública (ver routes/locations.ts's próprio select, mais restrito
// ainda por não incluir latitude/longitude).
export const GEO_LOCATION_SELECT = {
  id: true, name: true, countryCode: true,
  admin1Name: true, admin2Name: true,
  latitude: true, longitude: true,
} as const

type GeoLocationRef = LocationLabelInput & { id: string; latitude: number; longitude: number }

// resolveDisplayLabel — secção 13 do pedido: o que é mostrado no perfil
// depende de Profile.locationVisibility. CUSTOM_LOCALITY mostra o texto
// livre (com fallback para REFERENCE_LOCALITY quando vazio, tal como
// pedido explicitamente); REFERENCE_LOCALITY mostra só o nome oficial da
// localidade (não a etiqueta completa com distrito/país — essa é usada só
// nos resultados de pesquisa, ver locationNormalizationService.buildLocationLabel);
// REGION_ONLY mostra só o distrito/região. Nunca mostra coordenadas.
export const resolveDisplayLabel = (params: {
  customLocality?: string | null
  locationVisibility?: string | null
  location: GeoLocationRef | null
}): string | null => {
  if (!params.location) return params.customLocality || null
  const visibility = params.locationVisibility || 'REFERENCE_LOCALITY'
  if (visibility === 'CUSTOM_LOCALITY') return params.customLocality || params.location.name
  if (visibility === 'REGION_ONLY') {
    return params.location.admin1Name ? `Distrito de ${params.location.admin1Name}` : params.location.name
  }
  return params.location.name
}

// ── Localização habitual ────────────────────────────────────────────────
export const getHomeLocation = async (profileId: string): Promise<HomeLocation> => {
  const profile = await (prisma as any).profile.findUnique({
    where: { id: profileId },
    select: {
      city: true, country: true,
      homeLocationId: true, customLocality: true, locationVisibility: true,
      homeLocation: { select: GEO_LOCATION_SELECT },
    },
  })

  const geo: GeoLocationRef | null = profile?.homeLocation || null
  if (geo) {
    return {
      country: normalizeCountry(geo.countryCode),
      city: geo.name,
      cityNormalized: normalizeCity(geo.name),
      locationId: geo.id,
      coordinates: { latitude: geo.latitude, longitude: geo.longitude },
      displayLabel: resolveDisplayLabel({
        customLocality: profile?.customLocality, locationVisibility: profile?.locationVisibility, location: geo,
      }),
    }
  }

  // Legacy — sem homeLocationId, cai em fallback total para city/country
  // em texto livre (comportamento idêntico ao da Fase 3D, antes desta
  // funcionalidade existir).
  return {
    country: normalizeCountry(profile?.country),
    city: profile?.city || null,
    cityNormalized: normalizeCity(profile?.city),
    locationId: null,
    coordinates: null,
    displayLabel: profile?.customLocality || profile?.city || null,
  }
}

// ── Travel Mode actualmente em vigor (aprovado, ainda não terminado) ──────
// Só um TravelMode SCHEDULED+active conta — WAITING_MEMBER_APPROVAL nunca
// afecta Discovery (secção 6 do pedido Fase 3D: só depois de "todos
// aprovarem" é que passa a SCHEDULED), e CANCELLED nunca conta. endDate >=
// agora exclui viagens já terminadas mesmo que o status na BD ainda não
// tenha sido actualizado por nenhum job (não existe cron a fazer isso — a
// expiração é sempre calculada aqui, em tempo de leitura, nunca escrita de
// volta).
// Select mínimo necessário para chamar deriveTravelModeLocation sobre uma
// linha de TravelMode — reutilizado por getCurrentTravelMode (abaixo) e por
// routes/travel.ts (para anotar TODAS as janelas de viagem devolvidas por
// GET /travel/me, não só a "actual", sem duplicar esta lógica lá).
export const TRAVEL_LOCATION_SELECT = {
  destinationLocationId: true, customDestinationLocality: true,
  destinationLocation: { select: GEO_LOCATION_SELECT },
} as const

export interface DerivedTravelLocation {
  country: string | null
  city: string | null
  cityNormalized: string | null
  locationId: string | null
  coordinates: GeoCoordinates | null
  displayLabel: string | null
}

// Função pura — sem acesso à BD — que transforma uma linha de TravelMode
// (já com a relação destinationLocation carregada, se existir) no mesmo
// shape derivado que getCurrentTravelMode usa para a janela "actual".
// Extraída para aqui para que routes/travel.ts possa aplicar exactamente a
// mesma lógica a CADA janela de uma lista (histórico incluído), em vez de
// só à mais próxima, sem duplicar a árvore if/else de derivação.
export const deriveTravelModeLocation = (travel: {
  city: string | null
  country: string | null
  destinationLocationId?: string | null
  customDestinationLocality?: string | null
  destinationLocation?: GeoLocationRef | null
}): DerivedTravelLocation => {
  const geo: GeoLocationRef | null = travel.destinationLocation || null
  if (geo) {
    return {
      country: normalizeCountry(geo.countryCode),
      city: geo.name,
      cityNormalized: normalizeCity(geo.name),
      locationId: geo.id,
      coordinates: { latitude: geo.latitude, longitude: geo.longitude },
      displayLabel: resolveDisplayLabel({
        customLocality: travel.customDestinationLocality, locationVisibility: 'CUSTOM_LOCALITY', location: geo,
      }),
    }
  }
  // Legacy — Travel Mode criado antes desta funcionalidade, só com
  // city/country em texto livre.
  return {
    country: normalizeCountry(travel.country),
    city: travel.city,
    cityNormalized: normalizeCity(travel.city),
    locationId: null,
    coordinates: null,
    displayLabel: travel.customDestinationLocality || travel.city || null,
  }
}

export const getCurrentTravelMode = async (profileId: string, atDate: Date = new Date()): Promise<CurrentTravelMode | null> => {
  const travel = await (prisma as any).travelMode.findFirst({
    where: { profileId, status: 'SCHEDULED', active: true, endDate: { gte: atDate } },
    orderBy: { startDate: 'asc' },
    select: {
      id: true, profileId: true, city: true, country: true, startDate: true, endDate: true, status: true,
      ...TRAVEL_LOCATION_SELECT,
    },
  })
  if (!travel) return null

  const derived = deriveTravelModeLocation(travel)
  return {
    id: travel.id,
    profileId: travel.profileId,
    startDate: travel.startDate,
    endDate: travel.endDate,
    status: travel.status,
    ...derived,
  }
}

// Nome pedido explicitamente pela secção 15 do pedido de sistema de
// localidades — mesma função que getCurrentTravelMode (mantido esse nome
// também porque já é importado por discoveryService.ts/travel.ts).
export const getRelevantTravelMode = getCurrentTravelMode

// ── Relevância temporal de um Travel Mode ──────────────────────────────
// FUTURE  — antes de startDate: já pode surgir no Discovery do destino
//           (secção Discovery ponto 3), mas a UI nunca pode dizer "estás
//           em X" (secção UI) — só "vais estar".
// ACTIVE  — entre startDate e endDate (inclusive): é o destino efectivo.
// EXPIRED — depois de endDate: já não conta para nada, regressa-se à
//           localização habitual.
export const isTravelModeRelevantAt = (
  travel: { startDate: Date; endDate: Date } | null,
  atDate: Date = new Date()
): TravelRelevance => {
  if (!travel) return null
  const t = atDate.getTime()
  if (t < travel.startDate.getTime()) return 'FUTURE'
  if (t <= travel.endDate.getTime()) return 'ACTIVE'
  return 'EXPIRED'
}

// ── Localização efectiva ────────────────────────────────────────────────
// A. Sem Travel Mode -> localização habitual.
// B. Travel Mode FUTURE -> já usa o destino (Discovery futuro), mas fica
//    marcado como tal (source: TRAVEL_FUTURE) para a UI nunca afirmar
//    presença física antecipada.
// C. Travel Mode ACTIVE -> destino, source: TRAVEL_ACTIVE.
// D. Travel Mode EXPIRED (ou inexistente) -> localização habitual — nunca
//    é preciso "reverter" nada porque nunca escrevemos por cima da
//    localização habitual (regra 7 do pedido Fase 3D: "Travel Mode nunca
//    altera permanentemente a localização habitual").
// E. Travel Mode CANCELLED -> já excluído por getCurrentTravelMode (nunca
//    devolvido), logo cai directamente no caso A.
export const getEffectiveLocation = async (
  profileId: string, atDate: Date = new Date()
): Promise<EffectiveLocation> => {
  const travel = await getCurrentTravelMode(profileId, atDate)
  const relevance = isTravelModeRelevantAt(travel, atDate)

  if (travel && (relevance === 'FUTURE' || relevance === 'ACTIVE')) {
    return {
      country: travel.country,
      city: travel.city,
      cityNormalized: travel.cityNormalized,
      locationId: travel.locationId,
      coordinates: travel.coordinates,
      displayLabel: travel.displayLabel,
      source: relevance === 'ACTIVE' ? 'TRAVEL_ACTIVE' : 'TRAVEL_FUTURE',
      travelMode: travel,
    }
  }

  const home = await getHomeLocation(profileId)
  return { ...home, source: 'HOME', travelMode: null }
}

// Forma pedida literalmente pela secção 15 do pedido de sistema de
// localidades — um resumo mais pequeno de getEffectiveLocation, sem os
// campos legacy (country/city/cityNormalized), para consumo directo por
// rotas/UI que só precisam de "qual é a localização efectiva e porquê".
// Nota: os valores de `source` aqui ("FUTURE_TRAVEL"/"ACTIVE_TRAVEL") são
// os pedidos textualmente pela secção 15 — internamente
// EffectiveLocation.source usa "TRAVEL_FUTURE"/"TRAVEL_ACTIVE" (Fase 3D,
// já consumido por discoveryService.ts) para não obrigar a alterar código
// já em produção; esta função só faz a tradução no limite da API.
export interface EffectiveLocationContext {
  locationId: string | null
  source: 'HOME' | 'FUTURE_TRAVEL' | 'ACTIVE_TRAVEL'
  displayLabel: string | null
  travelStartDate: Date | null
  travelEndDate: Date | null
}

const CONTEXT_SOURCE_MAP: Record<EffectiveLocationSource, EffectiveLocationContext['source']> = {
  HOME: 'HOME',
  TRAVEL_FUTURE: 'FUTURE_TRAVEL',
  TRAVEL_ACTIVE: 'ACTIVE_TRAVEL',
}

// ── Nunca expor coordenadas a uma resposta HTTP (secção 9 do pedido: "as
// coordenadas devem permanecer no backend para cálculo") ──────────────────
// getHomeLocation/getEffectiveLocation/getCurrentTravelMode devolvem
// `coordinates` porque SÃO usados internamente para cálculo de distância
// (ver discoveryService.ts, betweenScoreService.ts) — mas qualquer rota que
// sirva estes objectos directamente ao frontend (ex.: GET /travel/me) tem
// de os passar por aqui primeiro. getEffectiveLocationContext (acima) já
// nasce sem `coordinates` — não precisa disto.
export function withoutCoordinates<T extends { coordinates?: GeoCoordinates | null }>(loc: T): Omit<T, 'coordinates'> {
  const { coordinates, ...rest } = loc
  return rest
}

export const toPublicEffectiveLocation = (loc: EffectiveLocation) => ({
  ...withoutCoordinates(loc),
  travelMode: loc.travelMode ? withoutCoordinates(loc.travelMode) : null,
})

export const getEffectiveLocationContext = async (
  profileId: string, atDate: Date = new Date()
): Promise<EffectiveLocationContext> => {
  const effective = await getEffectiveLocation(profileId, atDate)
  return {
    locationId: effective.locationId,
    source: CONTEXT_SOURCE_MAP[effective.source],
    displayLabel: effective.displayLabel,
    travelStartDate: effective.travelMode?.startDate || null,
    travelEndDate: effective.travelMode?.endDate || null,
  }
}

// ── Política de alteração da localização habitual (secção 4 do pedido
// Fase 3D / secção 12 do pedido de localidades) ─────────────────────────
// Livre e ilimitada enquanto o perfil está em DRAFT (onboarding — "permitir
// correção durante onboarding"). Depois de confirmada (onboarding
// concluído), aplica-se um cooldown — 90 dias por omissão — antes de se
// poder voltar a mudar. Isto é uma política de INTEGRIDADE DE DADOS
// (evitar simular viagens mudando a localização habitual em vez de usar o
// Travel Mode de verdade), não uma entitlement comercial — nunca gira à
// volta de plano (nem FREE nem PREMIUM podem falsificar residência
// livremente — secção 12 do pedido de localidades é explícita: a política
// é igual para todos os planos), e nunca é possível pagar para a saltar.
// Uma alteração que não muda de facto a localidade de referência (ou
// cidade/país legacy) não consome nem verifica o cooldown.
export const HOME_LOCATION_COOLDOWN_DAYS = Number(process.env.HOME_LOCATION_COOLDOWN_DAYS || 90)

export interface HomeLocationChangeCheck {
  allowed: boolean
  reason: 'NO_CHANGE' | 'ONBOARDING' | 'FIRST_CONFIRMATION' | 'COOLDOWN_ELAPSED' | 'COOLDOWN_ACTIVE'
  nextAllowedAt?: Date
}

export const canChangeHomeLocation = (
  profile: {
    status: string
    homeLocationUpdatedAt: Date | null
    // Legacy (Fase 3D)
    city: string | null
    country: string | null
    // Sistema de localidades (novo, opcional — perfis ainda sem
    // homeLocationId simplesmente não o têm)
    homeLocationId?: string | null
  },
  next: { city?: string | null; country?: string | null; homeLocationId?: string | null },
  now: Date = new Date()
): HomeLocationChangeCheck => {
  // Se o chamador está a passar homeLocationId (fluxo novo, baseado no
  // catálogo), a mudança real é "a localidade de referência é diferente
  // da actual" — comparação directa de id, nunca por nome (duas
  // localidades chamadas "São Pedro" em distritos diferentes têm ids
  // diferentes e são mudanças reais). Senão, mantém a comparação legacy
  // por city/country normalizados (Fase 3D), para perfis que ainda não
  // adoptaram o catálogo.
  const referenceChanging = next.homeLocationId !== undefined
    ? next.homeLocationId !== (profile.homeLocationId ?? null)
    : (next.city !== undefined && normalizeCity(next.city) !== normalizeCity(profile.city)) ||
      (next.country !== undefined && normalizeCountry(next.country) !== normalizeCountry(profile.country))

  if (!referenceChanging) return { allowed: true, reason: 'NO_CHANGE' }

  if (profile.status === 'DRAFT') return { allowed: true, reason: 'ONBOARDING' }

  if (!profile.homeLocationUpdatedAt) return { allowed: true, reason: 'FIRST_CONFIRMATION' }

  const cooldownEnd = new Date(profile.homeLocationUpdatedAt.getTime() + HOME_LOCATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
  if (now.getTime() < cooldownEnd.getTime()) {
    return { allowed: false, reason: 'COOLDOWN_ACTIVE', nextAllowedAt: cooldownEnd }
  }
  return { allowed: true, reason: 'COOLDOWN_ELAPSED' }
}
