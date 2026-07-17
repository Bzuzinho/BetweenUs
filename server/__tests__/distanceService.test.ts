// Sistema de localidades — testes puros (sem BD) para distanceService.ts.
// calculateDistanceKm/roundDistanceForDisplay/getDistanceBucket nunca
// tocam a base de dados — só matemática sobre coordenadas já resolvidas.
import { calculateDistanceKm, roundDistanceForDisplay, getDistanceBucket } from '../src/lib/distanceService'

// Lisboa e Porto — distância real conhecida (~274km em linha reta).
const LISBOA = { latitude: 38.7223, longitude: -9.1393 }
const PORTO = { latitude: 41.1579, longitude: -8.6291 }

describe('calculateDistanceKm', () => {
  it('is 0 for the same point', () => {
    expect(calculateDistanceKm(LISBOA, LISBOA)).toBeCloseTo(0, 5)
  })

  it('is symmetric — a→b equals b→a', () => {
    const ab = calculateDistanceKm(LISBOA, PORTO)
    const ba = calculateDistanceKm(PORTO, LISBOA)
    expect(ab).toBeCloseTo(ba, 8)
  })

  it('matches the known real-world distance between Lisboa and Porto (~270-280km)', () => {
    const km = calculateDistanceKm(LISBOA, PORTO)
    expect(km).toBeGreaterThan(260)
    expect(km).toBeLessThan(290)
  })
})

describe('roundDistanceForDisplay', () => {
  it('rounds to the nearest whole km under 10km', () => {
    expect(roundDistanceForDisplay(4.6)).toBe(5)
    expect(roundDistanceForDisplay(0.2)).toBe(0)
  })

  it('rounds to the nearest 5km between 10 and 100km', () => {
    expect(roundDistanceForDisplay(17.36)).toBe(15)
    expect(roundDistanceForDisplay(23)).toBe(25)
  })

  it('rounds to the nearest 25km at 100km or above', () => {
    expect(roundDistanceForDisplay(274)).toBe(275)
    expect(roundDistanceForDisplay(101)).toBe(100)
  })

  it('never produces the kind of over-precise value the spec explicitly forbids', () => {
    // "17,36 km" is the literal example the spec calls out as wrong.
    expect(roundDistanceForDisplay(17.36)).not.toBe(17.36)
  })
})

describe('getDistanceBucket', () => {
  it.each([
    [3, '0-10'],
    [9.9, '0-10'],
    [10, '10-25'],
    [24.9, '10-25'],
    [25, '25-50'],
    [49, '25-50'],
    [50, '50-100'],
    [99, '50-100'],
    [100, '100-250'],
    [249, '100-250'],
    [250, '250+'],
    [1000, '250+'],
  ])('classifies %skm as bucket %s', (km, expected) => {
    expect(getDistanceBucket(km).bucket).toBe(expected)
  })

  it('never returns a raw numeric distance in its label', () => {
    const { label } = getDistanceBucket(17.36)
    expect(label).not.toMatch(/17[.,]36/)
  })
})
