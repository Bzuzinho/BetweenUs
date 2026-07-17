/**
 * Sistema de localidades — importação do catálogo GeoNames (secção 3/7 do
 * pedido). Fonte: https://download.geonames.org/export/dump/{PAIS}.zip
 * Formato: https://download.geonames.org/export/dump/readme.txt
 * Licença: Creative Commons Attribution 4.0 — atribuição em
 * docs/product/GEONAMES_IMPORT.md.
 *
 * Uso:
 *   npm run geo:import -- --country=PT --dry-run
 *   npm run geo:import -- --country=PT
 *   npm run geo:import -- --country=PT --replace
 *   npm run geo:import -- --country=PT --file=/caminho/para/PT.txt
 *   npm run geo:import -- --country=PT --download
 *   npm run geo:stats
 *
 * Ficheiros de entrada esperados (formato GeoNames, tab-separated, sem
 * cabeçalho):
 *   - {PAIS}.txt         — dump principal (19 colunas, ver readme.txt)
 *   - admin1CodesASCII.txt (opcional) — nomes de distrito/região
 *   - admin2Codes.txt      (opcional) — nomes de concelho/município
 *
 * Sem --file nem --download, o script procura em
 * server/data/geonames/{PAIS}.txt (pasta ignorada pelo Git — nunca
 * comitar dumps do GeoNames no repositório). Os ficheiros admin1/admin2
 * são procurados na mesma pasta (admin1CodesASCII.txt / admin2Codes.txt);
 * se não existirem, o import continua na mesma — admin1Name/admin2Name
 * ficam null para as linhas afectadas, e isso é reportado no resumo, nunca
 * escondido.
 *
 * --download tenta buscar o zip directamente de download.geonames.org e
 * descomprimir com o comando `unzip` do sistema. Em ambientes sem acesso
 * de rede a esse domínio (ex.: sandboxes de desenvolvimento com allowlist
 * de rede restrito) isto falha explicitamente — usa --file ou coloca o
 * ficheiro no caminho por omissão.
 */
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { execFileSync } from 'child_process'
import prisma from '../lib/prisma'
import { normalizeLocationName, normalizeCountryCode } from '../lib/locationNormalizationService'

// Feature codes mínimos (secção 7 do pedido) — allowlist deliberada em vez
// de denylist: ao só incluir estes códigos, variantes históricas/
// abandonadas do GeoNames (PPLH, PPLQ, PPLW, PPLF, ...) ficam
// automaticamente de fora sem ser preciso enumerá-las.
export const INCLUDED_FEATURE_CODES = new Set([
  'PPLC', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPL', 'PPLX', 'PPLL', 'PPLS',
])

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'geonames')
const BATCH_SIZE = 200

// `export` nestas duas (interface + função) só para serem testáveis
// directamente em __tests__/importGeoNames.test.ts sem depender de
// ficheiros/BD — são puras (nenhum I/O), o resto do script continua
// privado a este módulo.
export interface ParsedArgs {
  country?: string
  dryRun: boolean
  replace: boolean
  file?: string
  download: boolean
  admin1File?: string
  admin2File?: string
}

export const parseArgs = (argv: string[]): ParsedArgs => {
  const args: ParsedArgs = { dryRun: false, replace: false, download: false }
  for (const raw of argv) {
    const [flag, value] = raw.replace(/^--/, '').split('=')
    if (flag === 'country') args.country = value
    else if (flag === 'dry-run') args.dryRun = true
    else if (flag === 'replace') args.replace = true
    else if (flag === 'file') args.file = value
    else if (flag === 'download') args.download = true
    else if (flag === 'admin1File') args.admin1File = value
    else if (flag === 'admin2File') args.admin2File = value
  }
  return args
}

// ── GeoNames row (19 colunas, ver readme.txt) ───────────────────────────
export interface GeoNamesRow {
  geonamesId: number
  name: string
  asciiName: string
  alternateNames: string
  latitude: number
  longitude: number
  featureClass: string
  featureCode: string
  countryCode: string
  admin1Code: string
  admin2Code: string
  population: bigint | null
  timezone: string
}

export const parseRow = (line: string): { row: GeoNamesRow | null; error: string | null } => {
  const cols = line.split('\t')
  if (cols.length < 19) return { row: null, error: `linha com ${cols.length} colunas (esperava 19)` }

  const geonamesId = Number(cols[0])
  const latitude = Number(cols[4])
  const longitude = Number(cols[5])
  if (!geonamesId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { row: null, error: 'geonameid/latitude/longitude inválidos' }
  }
  if (!cols[1]?.trim()) return { row: null, error: 'nome vazio' }

  const populationRaw = cols[14]?.trim()
  let population: bigint | null = null
  if (populationRaw && populationRaw !== '0') {
    try { population = BigInt(populationRaw) } catch { population = null }
  }

  return {
    row: {
      geonamesId,
      name: cols[1].trim(),
      asciiName: cols[2]?.trim() || '',
      alternateNames: cols[3]?.trim() || '',
      latitude, longitude,
      featureClass: cols[6]?.trim() || '',
      featureCode: cols[7]?.trim() || '',
      countryCode: normalizeCountryCode(cols[8]),
      admin1Code: cols[10]?.trim() || '',
      admin2Code: cols[11]?.trim() || '',
      population,
      timezone: cols[17]?.trim() || '',
    },
    error: null,
  }
}

// ── admin1CodesASCII.txt / admin2Codes.txt (opcionais) ──────────────────
// Formato: "PT.11\tLisboa\tLisboa\t2267057\n" (código\tnome\tasciiname\tgeonameid)
const loadAdminNames = async (filePath?: string): Promise<Map<string, string>> => {
  const map = new Map<string, string>()
  if (!filePath || !fs.existsSync(filePath)) return map
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    const [code, name] = line.split('\t')
    if (code && name) map.set(code.trim(), name.trim())
  }
  return map
}

// ── Download opcional (secção 7 do pedido: "aceitar caminho local ou
// fazer download explícito") ─────────────────────────────────────────
const downloadAndExtract = async (country: string): Promise<string> => {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const zipUrl = `https://download.geonames.org/export/dump/${country}.zip`
  const zipPath = path.join(DATA_DIR, `${country}.zip`)
  console.log(`A descarregar ${zipUrl} ...`)
  const response = await fetch(zipUrl)
  if (!response.ok) {
    throw new Error(`Download falhou (${response.status}). Sem acesso de rede a download.geonames.org? Usa --file com um PT.txt já descarregado manualmente.`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(zipPath, buffer)
  console.log(`Descarregado para ${zipPath}, a descomprimir...`)
  try {
    execFileSync('unzip', ['-o', zipPath, `${country}.txt`, '-d', DATA_DIR], { stdio: 'inherit' })
  } catch (err: any) {
    throw new Error(`Falha a descomprimir com \`unzip\` (${err.message}). Descomprime ${zipPath} manualmente e usa --file.`)
  }
  return path.join(DATA_DIR, `${country}.txt`)
}

interface ImportSummary {
  linesRead: number
  valid: number
  imported: number
  updated: number
  skipped: number
  errors: number
  errorSamples: string[]
  deactivated: number
  admin1Missing: number
  admin2Missing: number
}

const printSummary = (summary: ImportSummary, dryRun: boolean) => {
  console.log('')
  console.log(`── Resumo da importação${dryRun ? ' (DRY-RUN — nada foi escrito na BD)' : ''} ──`)
  console.log(`Linhas lidas:        ${summary.linesRead}`)
  console.log(`Linhas válidas:      ${summary.valid}`)
  console.log(`Importadas (novas):  ${summary.imported}`)
  console.log(`Actualizadas:        ${summary.updated}`)
  console.log(`Ignoradas (filtro):  ${summary.skipped}`)
  console.log(`Erros de parsing:    ${summary.errors}`)
  if (summary.errorSamples.length) {
    console.log(`  Exemplos: ${summary.errorSamples.slice(0, 5).join(' | ')}`)
  }
  if (summary.deactivated) console.log(`Desactivadas (--replace, já não presentes na fonte): ${summary.deactivated}`)
  if (summary.admin1Missing) console.log(`Aviso: ${summary.admin1Missing} localidades sem nome de distrito/região (admin1CodesASCII.txt não fornecido ou código sem correspondência).`)
  if (summary.admin2Missing) console.log(`Aviso: ${summary.admin2Missing} localidades sem nome de concelho/município (admin2Codes.txt não fornecido ou código sem correspondência).`)
}

async function runImport(args: ParsedArgs) {
  if (!args.country) {
    console.error('Uso: npm run geo:import -- --country=PT [--dry-run] [--replace] [--file=caminho] [--download]')
    process.exit(1)
  }
  const country = normalizeCountryCode(args.country)

  let filePath = args.file
  if (!filePath && args.download) filePath = await downloadAndExtract(country)
  if (!filePath) filePath = path.join(DATA_DIR, `${country}.txt`)

  if (!fs.existsSync(filePath)) {
    console.error(`Ficheiro não encontrado: ${filePath}`)
    console.error('')
    console.error(`Descarrega manualmente https://download.geonames.org/export/dump/${country}.zip,`)
    console.error(`descomprime, e coloca ${country}.txt em ${DATA_DIR}/ (ou usa --file=<caminho>).`)
    process.exit(1)
  }

  const admin1Path = args.admin1File || path.join(DATA_DIR, 'admin1CodesASCII.txt')
  const admin2Path = args.admin2File || path.join(DATA_DIR, 'admin2Codes.txt')
  const admin1Names = await loadAdminNames(fs.existsSync(admin1Path) ? admin1Path : undefined)
  const admin2Names = await loadAdminNames(fs.existsSync(admin2Path) ? admin2Path : undefined)
  if (admin1Names.size === 0) console.log(`Aviso: sem admin1CodesASCII.txt em ${admin1Path} — admin1Name ficará vazio.`)
  if (admin2Names.size === 0) console.log(`Aviso: sem admin2Codes.txt em ${admin2Path} — admin2Name ficará vazio.`)

  const summary: ImportSummary = {
    linesRead: 0, valid: 0, imported: 0, updated: 0, skipped: 0, errors: 0,
    errorSamples: [], deactivated: 0, admin1Missing: 0, admin2Missing: 0,
  }

  const seenGeonamesIds = new Set<number>()
  let batch: GeoNamesRow[] = []

  const flushBatch = async () => {
    if (batch.length === 0) return
    for (const row of batch) {
      const admin1Name = admin1Names.get(`${row.countryCode}.${row.admin1Code}`) || null
      const admin2Name = admin2Names.get(`${row.countryCode}.${row.admin1Code}.${row.admin2Code}`) || null
      if (!admin1Name) summary.admin1Missing++
      if (!admin2Name) summary.admin2Missing++

      if (args.dryRun) continue // dry-run nunca escreve — secção 7, ponto 12

      const data = {
        countryCode: row.countryCode,
        name: row.name,
        normalizedName: normalizeLocationName(row.name),
        asciiName: row.asciiName || null,
        alternateNames: row.alternateNames || null,
        latitude: row.latitude,
        longitude: row.longitude,
        featureClass: row.featureClass,
        featureCode: row.featureCode || null,
        population: row.population,
        admin1Code: row.admin1Code || null,
        admin2Code: row.admin2Code || null,
        admin1Name, admin2Name,
        timezone: row.timezone || null,
        active: true,
      }

      // Upsert por geonamesId — idempotente por construção (secção 7,
      // pontos 7-8): correr o mesmo import duas vezes produz o mesmo
      // estado final, nunca duplicados.
      const existing = await (prisma as any).geoLocation.findUnique({ where: { geonamesId: row.geonamesId }, select: { id: true } })
      await (prisma as any).geoLocation.upsert({
        where: { geonamesId: row.geonamesId },
        create: { geonamesId: row.geonamesId, ...data },
        update: data,
      })
      if (existing) summary.updated++
      else summary.imported++
    }
    batch = []
  }

  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    summary.linesRead++
    const { row, error } = parseRow(line)
    if (!row) {
      summary.errors++
      if (summary.errorSamples.length < 5) summary.errorSamples.push(error || 'erro desconhecido')
      continue
    }
    if (row.countryCode !== country) { summary.skipped++; continue }
    if (row.featureClass !== 'P' || !INCLUDED_FEATURE_CODES.has(row.featureCode)) { summary.skipped++; continue }

    summary.valid++
    seenGeonamesIds.add(row.geonamesId)
    batch.push(row)
    if (batch.length >= BATCH_SIZE) await flushBatch()
  }
  await flushBatch()

  // --replace: qualquer localidade deste país já na BD mas ausente desta
  // importação é DESACTIVADA (nunca apagada — pode estar referenciada por
  // Profile.homeLocationId/TravelMode.destinationLocationId; apagar
  // partiria essas FKs ou exigiria SET NULL silencioso em dados reais de
  // utilizadores, o que esta funcionalidade nunca faz por conta própria).
  if (args.replace && !args.dryRun) {
    const existingIds: Array<{ id: string; geonamesId: number }> = await (prisma as any).geoLocation.findMany({
      where: { countryCode: country, active: true }, select: { id: true, geonamesId: true },
    })
    const staleIds = existingIds.filter(l => !seenGeonamesIds.has(l.geonamesId)).map(l => l.id)
    if (staleIds.length > 0) {
      await (prisma as any).geoLocation.updateMany({ where: { id: { in: staleIds } }, data: { active: false } })
      summary.deactivated = staleIds.length
    }
  }

  printSummary(summary, args.dryRun)
}

// `require.main === module` — só corre automaticamente quando o script é
// invocado directamente (`npm run geo:import`), nunca quando este ficheiro
// é importado por outro módulo (ex.: __tests__/importGeoNames.test.ts, que
// importa parseArgs/parseRow/INCLUDED_FEATURE_CODES para testar as partes
// puras sem tocar a BD nem o filesystem — sem esta guarda, o simples acto
// de importar o ficheiro num teste tentaria ligar-se à BD e ler argv).
if (require.main === module) {
  runImport(parseArgs(process.argv.slice(2)))
    .catch(err => { console.error('Falhou:', err.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
