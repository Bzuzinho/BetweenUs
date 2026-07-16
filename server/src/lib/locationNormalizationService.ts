// Sistema de localidades (GeoNames) — utilitários de normalização e
// apresentação partilhados por todo o sistema: script de importação
// (importGeoNames.ts), API de pesquisa (routes/locations.ts) e qualquer
// serviço que precise de comparar ou mostrar uma localidade catalogada.
//
// Princípio (igual ao já estabelecido na Fase 3D para city/country em
// texto livre, agora aplicado ao catálogo GeoLocation): nunca comparar
// strings de localização em bruto. O valor de apresentação original nunca
// é alterado por normalização — só uma versão à parte, normalizada, é
// usada em comparações/pesquisa.

// ── Normalização de texto (secção 8 do pedido) ─────────────────────────────
// trim, minúsculas, remoção de diferenças de acentos SÓ para pesquisa,
// colapso de espaços múltiplos. "Porto" / "PORTO" / " porto " / "Pôrto"
// (se aparecer como alias) normalizam todos para "porto".
export const normalizeLocationName = (value?: string | null): string => {
  if (!value) return ''
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove marcas diacríticas (á->a, ç->c, ô->o, ...)
    .replace(/\s+/g, ' ')
}

// País sempre em maiúsculas (ISO 3166-1 alpha-2, tal como devolvido pelo
// GeoNames na coluna countryCode — nunca o nome do país por extenso aqui).
export const normalizeCountryCode = (value?: string | null): string => {
  if (!value) return ''
  return value.trim().toUpperCase()
}

// Nomes de país para construção de label (buildLocationLabel). Cobre só os
// países realmente suportados pelo catálogo até agora (import inicial é
// só Portugal — secção 3 do pedido) mais alguns vizinhos comuns, em vez de
// tentar embutir a tabela ISO 3166 completa sem necessidade real ainda.
// Nunca usado para comparação/pesquisa — só apresentação. Se o código não
// estiver aqui, cai em fallback para o próprio código (ex.: "XX"), nunca
// rebenta.
const COUNTRY_NAMES: Record<string, string> = {
  PT: 'Portugal',
  ES: 'Espanha',
  FR: 'França',
  GB: 'Reino Unido',
  DE: 'Alemanha',
  IT: 'Itália',
  BR: 'Brasil',
  US: 'Estados Unidos',
  NL: 'Países Baixos',
  BE: 'Bélgica',
  CH: 'Suíça',
  LU: 'Luxemburgo',
  AD: 'Andorra',
  IE: 'Irlanda',
}

export const countryNameForCode = (countryCode?: string | null): string => {
  const code = normalizeCountryCode(countryCode)
  return COUNTRY_NAMES[code] || code
}

// Reverso de COUNTRY_NAMES — usado só por scripts/geoMapProfiles.ts para
// resolver o `country` legacy (texto livre, ex.: "Portugal", nunca um
// código ISO — ver Profile.country no schema.prisma) para o código ISO2
// necessário para procurar no catálogo GeoLocation. Nunca usado para
// comparação/pesquisa em runtime (Discovery/Between Score continuam a
// comparar por normalizeCountry, nunca por nome de país) — só nesta
// migração pontual, e só quando o texto bate certo com um dos nomes
// conhecidos (case/acento-insensível via normalizeLocationName). Um
// `country` legacy que não seja nem um código ISO2 válido nem um destes
// nomes fica de fora — nunca adivinhado.
const COUNTRY_CODES_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [normalizeLocationName(name), code])
)

export const countryCodeForName = (value?: string | null): string | null => {
  const asCode = normalizeCountryCode(value)
  if (asCode && COUNTRY_NAMES[asCode]) return asCode // já é um código ISO2 válido conhecido
  const byName = COUNTRY_CODES_BY_NAME[normalizeLocationName(value)]
  return byName || null
}

// Forma mínima de GeoLocation necessária para construir um rótulo — usa um
// tipo estrutural em vez de importar o tipo do Prisma Client aqui, para
// este ficheiro não depender do client gerado (útil também para testes
// unitários que não tocam a BD).
export interface LocationLabelInput {
  name: string
  admin1Name?: string | null
  admin2Name?: string | null
  countryCode: string
}

// buildLocationLabel — "Benedita — Alcobaça, Leiria, Portugal" (secção 1
// do pedido, exemplo dado). Omite peças em falta em vez de mostrar
// "undefined"/vazio: um GeoLocation sem admin2Name (concelho) mostra só
// "Benedita — Leiria, Portugal".
export const buildLocationLabel = (location: LocationLabelInput): string => {
  const regionParts = [location.admin2Name, location.admin1Name].filter(Boolean)
  const country = countryNameForCode(location.countryCode)
  const tail = [...regionParts, country].filter(Boolean).join(', ')
  return tail ? `${location.name} — ${tail}` : location.name
}

// buildSearchTokens — tokens normalizados usados na pesquisa por
// prefixo/alias (routes/locations.ts). Inclui o nome principal, o
// asciiName (quando difere — cobre variantes sem acentuação que o
// GeoNames já resolve) e cada entrada de alternateNames (string separada
// por vírgulas, tal como vem do dump principal do GeoNames — ver
// schema.prisma's GeoLocation.alternateNames comment). Sempre únicos e
// nunca vazios.
export interface SearchTokensInput {
  name: string
  asciiName?: string | null
  alternateNames?: string | null
}

export const buildSearchTokens = (location: SearchTokensInput): string[] => {
  const tokens = new Set<string>()
  const add = (raw?: string | null) => {
    const normalized = normalizeLocationName(raw)
    if (normalized) tokens.add(normalized)
  }
  add(location.name)
  add(location.asciiName)
  ;(location.alternateNames || '')
    .split(',')
    .forEach(alt => add(alt))
  return [...tokens]
}
