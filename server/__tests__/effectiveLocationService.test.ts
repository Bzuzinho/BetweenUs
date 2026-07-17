// Testes puros (sem BD) para as funções de effectiveLocationService.ts que
// não tocam o Prisma: canChangeHomeLocation (cooldown, Fase 3D + sistema de
// localidades), resolveDisplayLabel (secção 13 do pedido de localidades),
// deriveTravelModeLocation, isTravelModeRelevantAt, withoutCoordinates/
// toPublicEffectiveLocation. getHomeLocation/getCurrentTravelMode/
// getEffectiveLocation exigem uma ligação real à BD (via prisma) e por
// isso não são cobertas aqui — ver __tests__/coupleTravelApproval.test.ts
// para esses (exige Postgres real, não corrido neste ambiente).
import {
  canChangeHomeLocation, resolveDisplayLabel, deriveTravelModeLocation,
  isTravelModeRelevantAt, withoutCoordinates, toPublicEffectiveLocation,
  normalizeCity, normalizeCountry, type EffectiveLocation,
} from '../src/lib/effectiveLocationService'

describe('canChangeHomeLocation', () => {
  const now = new Date('2026-07-16T12:00:00Z')

  it('allows any change during onboarding (status DRAFT), regardless of cooldown state', () => {
    const profile = { status: 'DRAFT', homeLocationUpdatedAt: now, city: 'Lisboa', country: 'PT' }
    const result = canChangeHomeLocation(profile, { city: 'Porto' }, now)
    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('ONBOARDING')
  })

  it('reports NO_CHANGE and allows it when the new value normalizes to the same as the current one', () => {
    const profile = { status: 'APPROVED', homeLocationUpdatedAt: now, city: 'Porto', country: 'PT' }
    const result = canChangeHomeLocation(profile, { city: 'PORTO ' }, now)
    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('NO_CHANGE')
  })

  it('allows the first confirmation post-onboarding when homeLocationUpdatedAt is still null', () => {
    const profile = { status: 'APPROVED', homeLocationUpdatedAt: null, city: 'Lisboa', country: 'PT' }
    const result = canChangeHomeLocation(profile, { city: 'Porto' }, now)
    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('FIRST_CONFIRMATION')
  })

  it('blocks a real change within the cooldown window and returns nextAllowedAt', () => {
    const updatedAt = new Date('2026-07-01T00:00:00Z') // 15 days before `now`
    const profile = { status: 'APPROVED', homeLocationUpdatedAt: updatedAt, city: 'Lisboa', country: 'PT' }
    const result = canChangeHomeLocation(profile, { city: 'Porto' }, now)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('COOLDOWN_ACTIVE')
    expect(result.nextAllowedAt).toBeInstanceOf(Date)
    expect(result.nextAllowedAt!.getTime()).toBeGreaterThan(now.getTime())
  })

  it('allows the change once the cooldown has elapsed (default 90 days)', () => {
    const updatedAt = new Date('2026-01-01T00:00:00Z') // well over 90 days before `now`
    const profile = { status: 'APPROVED', homeLocationUpdatedAt: updatedAt, city: 'Lisboa', country: 'PT' }
    const result = canChangeHomeLocation(profile, { city: 'Porto' }, now)
    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('COOLDOWN_ELAPSED')
  })

  // Sistema de localidades — quando next.homeLocationId está definido, a
  // comparação passa a ser por id, nunca por nome (o bug de homonímia:
  // "São Pedro" em dois distritos diferentes).
  describe('sistema de localidades — comparação por homeLocationId', () => {
    it('a different homeLocationId is a real change even if legacy city/country never changed', () => {
      const profile = { status: 'APPROVED', homeLocationUpdatedAt: now, city: 'Sao Pedro', country: 'PT', homeLocationId: 'geo-north' }
      const result = canChangeHomeLocation(profile, { homeLocationId: 'geo-south' }, now)
      expect(result.allowed).toBe(false) // within cooldown -> blocked, but crucially NOT "NO_CHANGE"
      expect(result.reason).toBe('COOLDOWN_ACTIVE')
    })

    it('the SAME homeLocationId is NO_CHANGE, allowed regardless of cooldown', () => {
      const profile = { status: 'APPROVED', homeLocationUpdatedAt: now, city: 'Sao Pedro', country: 'PT', homeLocationId: 'geo-north' }
      const result = canChangeHomeLocation(profile, { homeLocationId: 'geo-north' }, now)
      expect(result.allowed).toBe(true)
      expect(result.reason).toBe('NO_CHANGE')
    })

    it('setting homeLocationId for the first time (was null) is a real change', () => {
      const profile = { status: 'APPROVED', homeLocationUpdatedAt: now, city: null, country: null, homeLocationId: null }
      const result = canChangeHomeLocation(profile, { homeLocationId: 'geo-1' }, now)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('COOLDOWN_ACTIVE')
    })
  })
})

describe('resolveDisplayLabel', () => {
  const geo = { id: 'geo-1', name: 'Benedita', admin1Name: 'Leiria', admin2Name: 'Alcobaça', countryCode: 'PT', latitude: 39.4, longitude: -8.98 }

  it('falls back to customLocality (or null) when there is no catalog location at all', () => {
    expect(resolveDisplayLabel({ customLocality: 'Bairro X', locationVisibility: 'REFERENCE_LOCALITY', location: null })).toBe('Bairro X')
    expect(resolveDisplayLabel({ customLocality: null, locationVisibility: 'REFERENCE_LOCALITY', location: null })).toBeNull()
  })

  it('REFERENCE_LOCALITY shows only the official locality name, never the full label with district', () => {
    const label = resolveDisplayLabel({ customLocality: 'Bairro X', locationVisibility: 'REFERENCE_LOCALITY', location: geo })
    expect(label).toBe('Benedita')
  })

  it('CUSTOM_LOCALITY shows customLocality when present, falling back to the locality name when empty', () => {
    expect(resolveDisplayLabel({ customLocality: 'Bairro X', locationVisibility: 'CUSTOM_LOCALITY', location: geo })).toBe('Bairro X')
    expect(resolveDisplayLabel({ customLocality: null, locationVisibility: 'CUSTOM_LOCALITY', location: geo })).toBe('Benedita')
  })

  it('REGION_ONLY shows only the district, never the locality name or coordinates', () => {
    const label = resolveDisplayLabel({ customLocality: 'Bairro X', locationVisibility: 'REGION_ONLY', location: geo })
    expect(label).toBe('Distrito de Leiria')
    expect(label).not.toContain('Benedita')
  })

  it('defaults to REFERENCE_LOCALITY behavior when locationVisibility is missing', () => {
    const label = resolveDisplayLabel({ customLocality: null, locationVisibility: null, location: geo })
    expect(label).toBe('Benedita')
  })
})

describe('deriveTravelModeLocation', () => {
  const geo = { id: 'geo-1', name: 'Porto', admin1Name: 'Porto', admin2Name: null, countryCode: 'PT', latitude: 41.1579, longitude: -8.6291 }

  it('derives from the catalog location when destinationLocation is present, never leaking latitude/longitude structure by accident into city/country', () => {
    const result = deriveTravelModeLocation({ city: 'texto antigo', country: 'Portugal', destinationLocationId: 'geo-1', customDestinationLocality: null, destinationLocation: geo })
    expect(result.locationId).toBe('geo-1')
    expect(result.city).toBe('Porto') // catalog name wins over stale legacy `city`
    expect(result.country).toBe('PT')
    expect(result.coordinates).toEqual({ latitude: 41.1579, longitude: -8.6291 })
  })

  it('falls back to legacy city/country when there is no catalog destination', () => {
    const result = deriveTravelModeLocation({ city: 'Faro', country: 'PT', destinationLocationId: null, customDestinationLocality: null, destinationLocation: null })
    expect(result.locationId).toBeNull()
    expect(result.coordinates).toBeNull()
    expect(result.city).toBe('Faro')
  })

  it('customDestinationLocality overrides the display label when a catalog location exists', () => {
    const result = deriveTravelModeLocation({ city: null, country: null, destinationLocationId: 'geo-1', customDestinationLocality: 'zona ribeirinha', destinationLocation: geo })
    expect(result.displayLabel).toBe('zona ribeirinha')
  })
})

describe('isTravelModeRelevantAt', () => {
  const start = new Date('2026-08-01T00:00:00Z')
  const end = new Date('2026-08-10T00:00:00Z')

  it('returns null when there is no travel window', () => {
    expect(isTravelModeRelevantAt(null)).toBeNull()
  })

  it('returns FUTURE before the start date', () => {
    expect(isTravelModeRelevantAt({ startDate: start, endDate: end }, new Date('2026-07-20'))).toBe('FUTURE')
  })

  it('returns ACTIVE within the window, inclusive of both boundaries', () => {
    expect(isTravelModeRelevantAt({ startDate: start, endDate: end }, start)).toBe('ACTIVE')
    expect(isTravelModeRelevantAt({ startDate: start, endDate: end }, end)).toBe('ACTIVE')
    expect(isTravelModeRelevantAt({ startDate: start, endDate: end }, new Date('2026-08-05'))).toBe('ACTIVE')
  })

  it('returns EXPIRED after the end date', () => {
    expect(isTravelModeRelevantAt({ startDate: start, endDate: end }, new Date('2026-09-01'))).toBe('EXPIRED')
  })
})

describe('normalizeCity / normalizeCountry (Fase 3D, delegated to locationNormalizationService)', () => {
  it('normalizeCity trims/lowercases/strips accents, returns null (not empty string) for empty input', () => {
    expect(normalizeCity('  Pôrto ')).toBe('porto')
    expect(normalizeCity(null)).toBeNull()
    expect(normalizeCity('')).toBeNull()
  })

  it('normalizeCountry uppercases/trims, returns null for empty input', () => {
    expect(normalizeCountry(' pt ')).toBe('PT')
    expect(normalizeCountry(null)).toBeNull()
  })
})

// Sistema de localidades — nunca expor coordenadas numa resposta HTTP.
describe('withoutCoordinates / toPublicEffectiveLocation', () => {
  it('withoutCoordinates strips the coordinates field and nothing else', () => {
    const loc = { country: 'PT', city: 'Porto', cityNormalized: 'porto', locationId: 'geo-1', coordinates: { latitude: 1, longitude: 2 }, displayLabel: 'Porto' }
    const result = withoutCoordinates(loc)
    expect(result).not.toHaveProperty('coordinates')
    expect(result.city).toBe('Porto')
    expect(result.locationId).toBe('geo-1')
  })

  it('toPublicEffectiveLocation strips coordinates from both the top level and the nested travelMode', () => {
    const effective: EffectiveLocation = {
      country: 'PT', city: 'Porto', cityNormalized: 'porto', locationId: 'geo-1',
      coordinates: { latitude: 1, longitude: 2 }, displayLabel: 'Porto', source: 'TRAVEL_ACTIVE',
      travelMode: {
        id: 'travel-1', profileId: 'profile-1', country: 'PT', city: 'Porto', cityNormalized: 'porto',
        startDate: new Date(), endDate: new Date(), status: 'SCHEDULED',
        locationId: 'geo-1', coordinates: { latitude: 1, longitude: 2 }, displayLabel: 'Porto',
      },
    }
    const result = toPublicEffectiveLocation(effective)
    expect(result).not.toHaveProperty('coordinates')
    expect(result.travelMode).not.toHaveProperty('coordinates')
    expect(result.travelMode!.locationId).toBe('geo-1')
  })

  it('toPublicEffectiveLocation handles a null travelMode without throwing', () => {
    const effective: EffectiveLocation = {
      country: 'PT', city: 'Lisboa', cityNormalized: 'lisboa', locationId: null,
      coordinates: null, displayLabel: 'Lisboa', source: 'HOME', travelMode: null,
    }
    const result = toPublicEffectiveLocation(effective)
    expect(result.travelMode).toBeNull()
  })
})
