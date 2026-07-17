// Sistema de localidades — testes puros (sem BD) para
// locationNormalizationService.ts. Cobre normalização de nome/país,
// construção de rótulo, tokens de pesquisa, e a resolução nome→ISO2 usada
// por geo:map-profiles.
import {
  normalizeLocationName, normalizeCountryCode, countryNameForCode, countryCodeForName,
  buildLocationLabel, buildSearchTokens,
} from '../src/lib/locationNormalizationService'

describe('normalizeLocationName', () => {
  it('collapses case, accents, and surrounding whitespace to the same value', () => {
    expect(normalizeLocationName('Porto')).toBe('porto')
    expect(normalizeLocationName('PORTO')).toBe('porto')
    expect(normalizeLocationName('  porto  ')).toBe('porto')
    expect(normalizeLocationName('Pôrto')).toBe('porto')
  })

  it('collapses internal multi-spaces', () => {
    expect(normalizeLocationName('São   Pedro')).toBe('sao pedro')
  })

  it('returns empty string for null/undefined/empty input, never throws', () => {
    expect(normalizeLocationName(null)).toBe('')
    expect(normalizeLocationName(undefined)).toBe('')
    expect(normalizeLocationName('')).toBe('')
  })
})

describe('normalizeCountryCode', () => {
  it('uppercases and trims, never converts a country name to ISO2', () => {
    expect(normalizeCountryCode('pt')).toBe('PT')
    expect(normalizeCountryCode(' PT ')).toBe('PT')
    // deliberately NOT converted — normalizeCountryCode only handles
    // already-ISO2 input; free-text names go through countryCodeForName.
    expect(normalizeCountryCode('Portugal')).toBe('PORTUGAL')
  })

  it('returns empty string for null/undefined', () => {
    expect(normalizeCountryCode(null)).toBe('')
    expect(normalizeCountryCode(undefined)).toBe('')
  })
})

describe('countryNameForCode', () => {
  it('returns the known PT-language name for a known code', () => {
    expect(countryNameForCode('PT')).toBe('Portugal')
    expect(countryNameForCode('es')).toBe('Espanha')
  })

  it('falls back to the code itself for an unknown code, never throws', () => {
    expect(countryNameForCode('XX')).toBe('XX')
  })
})

describe('countryCodeForName — reverse lookup used by geo:map-profiles', () => {
  it('resolves an already-valid ISO2 code as-is', () => {
    expect(countryCodeForName('PT')).toBe('PT')
    expect(countryCodeForName('pt')).toBe('PT')
  })

  it('resolves a known full country name, case/accent-insensitive', () => {
    expect(countryCodeForName('Portugal')).toBe('PT')
    expect(countryCodeForName('portugal')).toBe('PT')
    expect(countryCodeForName('Espanha')).toBe('ES')
  })

  it('returns null for an unrecognized value — never guesses', () => {
    expect(countryCodeForName('Wakanda')).toBeNull()
    expect(countryCodeForName(null)).toBeNull()
    expect(countryCodeForName('')).toBeNull()
  })
})

describe('buildLocationLabel', () => {
  it('composes name — municipality, district, country when both admin levels are present', () => {
    const label = buildLocationLabel({ name: 'Benedita', admin1Name: 'Leiria', admin2Name: 'Alcobaça', countryCode: 'PT' })
    expect(label).toBe('Benedita — Alcobaça, Leiria, Portugal')
  })

  it('omits missing pieces instead of showing empty/undefined', () => {
    const label = buildLocationLabel({ name: 'Benedita', admin1Name: 'Leiria', admin2Name: null, countryCode: 'PT' })
    expect(label).toBe('Benedita — Leiria, Portugal')
    expect(label).not.toContain('undefined')
    expect(label).not.toContain('null')
  })

  it('falls back to just the name when there is nothing else at all', () => {
    const label = buildLocationLabel({ name: 'Somewhere', admin1Name: null, admin2Name: null, countryCode: 'XX' })
    expect(label).toBe('Somewhere — XX')
  })
})

describe('buildSearchTokens', () => {
  it('includes the normalized main name, asciiName, and each alternate name, deduplicated', () => {
    const tokens = buildSearchTokens({ name: 'São Pedro', asciiName: 'Sao Pedro', alternateNames: 'Sao Pedro,S. Pedro' })
    expect(tokens).toContain('sao pedro')
    expect(tokens).toContain('s. pedro')
    // "São Pedro" and "Sao Pedro" both normalize to "sao pedro" — must not duplicate
    expect(tokens.filter(t => t === 'sao pedro').length).toBe(1)
  })

  it('never includes an empty token', () => {
    const tokens = buildSearchTokens({ name: 'Benedita', asciiName: null, alternateNames: null })
    expect(tokens.every(t => t.length > 0)).toBe(true)
  })
})
