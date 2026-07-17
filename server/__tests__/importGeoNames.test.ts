// Sistema de localidades — testes puros (sem BD, sem filesystem) para as
// partes de importGeoNames.ts que não fazem I/O: parseArgs (parsing de
// flags CLI) e parseRow (parsing de uma linha do dump GeoNames, 19
// colunas). runImport/downloadAndExtract/loadAdminNames exigem BD e/ou
// filesystem e por isso não são testados aqui — nunca corridos neste
// ambiente (ver docs/product/GEONAMES_IMPORT.md).
import { parseArgs, parseRow, INCLUDED_FEATURE_CODES } from '../src/scripts/importGeoNames'

describe('parseArgs', () => {
  it('parses --country, --dry-run, --replace, --file, --download as their respective flags', () => {
    const args = parseArgs(['--country=PT', '--dry-run', '--replace', '--file=/tmp/PT.txt', '--download'])
    expect(args).toEqual({
      country: 'PT', dryRun: true, replace: true, file: '/tmp/PT.txt', download: true,
    })
  })

  it('defaults dryRun/replace/download to false and leaves country/file undefined when absent', () => {
    const args = parseArgs([])
    expect(args.dryRun).toBe(false)
    expect(args.replace).toBe(false)
    expect(args.download).toBe(false)
    expect(args.country).toBeUndefined()
    expect(args.file).toBeUndefined()
  })

  it('parses optional --admin1File/--admin2File', () => {
    const args = parseArgs(['--admin1File=/tmp/admin1.txt', '--admin2File=/tmp/admin2.txt'])
    expect(args.admin1File).toBe('/tmp/admin1.txt')
    expect(args.admin2File).toBe('/tmp/admin2.txt')
  })
})

describe('parseRow', () => {
  // Linha real de exemplo (formato GeoNames, 19 colunas tab-separated) —
  // geonameid, name, asciiname, alternatenames, lat, lng, feature class,
  // feature code, country code, cc2, admin1, admin2, admin3, admin4,
  // population, elevation, dem, timezone, modification date.
  const validLine = [
    '2267057', 'Lisbon', 'Lisbon', 'Lisboa,Lisbonne,Lissabon',
    '38.71667', '-9.13333', 'P', 'PPLC', 'PT', '',
    '11', '1106', '', '', '506654', '', '2', 'Europe/Lisbon', '2023-01-01',
  ].join('\t')

  it('parses a well-formed line into a GeoNamesRow', () => {
    const { row, error } = parseRow(validLine)
    expect(error).toBeNull()
    expect(row).not.toBeNull()
    expect(row!.geonamesId).toBe(2267057)
    expect(row!.name).toBe('Lisbon')
    expect(row!.countryCode).toBe('PT')
    expect(row!.featureClass).toBe('P')
    expect(row!.featureCode).toBe('PPLC')
    expect(row!.latitude).toBeCloseTo(38.71667, 4)
    expect(row!.longitude).toBeCloseTo(-9.13333, 4)
    expect(row!.population).toBe(506654n)
  })

  it('rejects a line with fewer than 19 columns, with a descriptive error', () => {
    const { row, error } = parseRow('123\tShort\tShort')
    expect(row).toBeNull()
    expect(error).toMatch(/colunas/)
  })

  it('rejects a line with a non-numeric geonameid/latitude/longitude', () => {
    const cols = validLine.split('\t')
    cols[0] = 'not-a-number'
    const { row, error } = parseRow(cols.join('\t'))
    expect(row).toBeNull()
    expect(error).toMatch(/inválidos/)
  })

  it('rejects a line with an empty name', () => {
    const cols = validLine.split('\t')
    cols[1] = '  '
    const { row, error } = parseRow(cols.join('\t'))
    expect(row).toBeNull()
    expect(error).toMatch(/nome vazio/)
  })

  it('treats a population of "0" the same as no population data (null, not 0n)', () => {
    const cols = validLine.split('\t')
    cols[14] = '0'
    const { row } = parseRow(cols.join('\t'))
    expect(row!.population).toBeNull()
  })

  it('normalizes the country code to uppercase via normalizeCountryCode', () => {
    const cols = validLine.split('\t')
    cols[8] = 'pt'
    const { row } = parseRow(cols.join('\t'))
    expect(row!.countryCode).toBe('PT')
  })
})

describe('INCLUDED_FEATURE_CODES — the populated-place allowlist', () => {
  it('includes the standard populated-place codes', () => {
    for (const code of ['PPLC', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPL', 'PPLX', 'PPLL', 'PPLS']) {
      expect(INCLUDED_FEATURE_CODES.has(code)).toBe(true)
    }
  })

  it('excludes historical/abandoned variants by omission (never an explicit denylist)', () => {
    for (const code of ['PPLH', 'PPLQ', 'PPLW', 'PPLF']) {
      expect(INCLUDED_FEATURE_CODES.has(code)).toBe(false)
    }
  })
})
