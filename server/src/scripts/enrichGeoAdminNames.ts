import prisma from '../lib/prisma'

const BASE_URL = 'https://download.geonames.org/export/dump'
const BATCH_SIZE = 250

const parseAdminFile = (text: string): Map<string, string> => {
  const map = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const [code, name] = line.split('\t')
    if (code && name) map.set(code.trim(), name.trim())
  }
  return map
}

const downloadText = async (filename: string): Promise<string> => {
  const url = `${BASE_URL}/${filename}`
  console.log(`A descarregar ${url} ...`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download de ${filename} falhou (${response.status})`)
  return response.text()
}

async function main() {
  const countryArg = process.argv.find(arg => arg.startsWith('--country='))
  const countryCode = (countryArg?.split('=')[1] || 'PT').trim().toUpperCase()

  const [admin1Text, admin2Text] = await Promise.all([
    downloadText('admin1CodesASCII.txt'),
    downloadText('admin2Codes.txt'),
  ])

  const admin1 = parseAdminFile(admin1Text)
  const admin2 = parseAdminFile(admin2Text)
  console.log(`Códigos carregados: admin1=${admin1.size}, admin2=${admin2.size}`)

  let cursor: string | undefined
  let processed = 0
  let updated = 0
  let missingAdmin1 = 0
  let missingAdmin2 = 0

  while (true) {
    const rows = await (prisma as any).geoLocation.findMany({
      where: { countryCode, active: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        admin1Code: true,
        admin2Code: true,
        admin1Name: true,
        admin2Name: true,
      },
    })

    if (rows.length === 0) break

    for (const row of rows) {
      const admin1Name = row.admin1Code
        ? admin1.get(`${countryCode}.${row.admin1Code}`) || null
        : null
      const admin2Name = row.admin1Code && row.admin2Code
        ? admin2.get(`${countryCode}.${row.admin1Code}.${row.admin2Code}`) || null
        : null

      if (!admin1Name) missingAdmin1++
      if (!admin2Name) missingAdmin2++

      if (row.admin1Name !== admin1Name || row.admin2Name !== admin2Name) {
        await (prisma as any).geoLocation.update({
          where: { id: row.id },
          data: { admin1Name, admin2Name },
        })
        updated++
      }
      processed++
    }

    cursor = rows[rows.length - 1].id
    console.log(`Processadas ${processed} localidades...`)
  }

  console.log('')
  console.log('── Resumo do enriquecimento administrativo ──')
  console.log(`País:                         ${countryCode}`)
  console.log(`Localidades processadas:      ${processed}`)
  console.log(`Localidades actualizadas:     ${updated}`)
  console.log(`Sem distrito/região:          ${missingAdmin1}`)
  console.log(`Sem concelho/município:       ${missingAdmin2}`)
}

main()
  .catch(err => {
    console.error('[GEO ADMIN ENRICH] Falhou:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
