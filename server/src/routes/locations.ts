// Sistema de localidades (GeoNames) — API de pesquisa do catálogo interno
// GeoLocation. Nunca devolve latitude/longitude ao frontend (secção 9 do
// pedido: "as coordenadas devem permanecer no backend para cálculo") — só
// id, nome, país, região, município e um rótulo já composto, prontos a
// mostrar.
//
// Segue o mesmo padrão de catalog.ts: `router.use(requireAuth)` para as
// rotas de leitura (país/pesquisa/detalhe — precisam de sessão, mas
// nenhuma role especial), `requireAdmin('catalog')` para as ferramentas
// de administração (secção 20 do pedido). O rate limit vem do
// `globalLimiter` já montado em `app.use('/api', globalLimiter)` (
// src/index.ts, antes de todos os routers) — não precisa de um limiter
// dedicado só para isto.
import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { normalizeLocationName, normalizeCountryCode, buildLocationLabel, countryNameForCode } from '../lib/locationNormalizationService'

const router = Router()
router.use(requireAuth)

// Nunca latitude/longitude aqui — este é exactamente o shape que a secção
// 9 do pedido pede para a resposta de pesquisa/detalhe.
const PUBLIC_LOCATION_SELECT = {
  id: true, name: true, countryCode: true, admin1Name: true, admin2Name: true,
} as const

const toPublicLocation = (loc: { id: string; name: string; countryCode: string; admin1Name: string | null; admin2Name: string | null }) => ({
  id: loc.id,
  name: loc.name,
  countryCode: loc.countryCode,
  admin1Name: loc.admin1Name,
  admin2Name: loc.admin2Name,
  label: buildLocationLabel(loc),
})

// GET /api/locations/countries — países que têm pelo menos uma localidade
// activa no catálogo. Construído a partir dos dados reais em vez de uma
// lista estática, para nunca listar um país que ainda não foi importado.
router.get('/countries', async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await (prisma as any).geoLocation.findMany({
      where: { active: true },
      distinct: ['countryCode'],
      select: { countryCode: true },
      orderBy: { countryCode: 'asc' },
    })
    const countries = rows.map((r: { countryCode: string }) => ({
      code: r.countryCode,
      name: countryNameForCode(r.countryCode),
    }))
    res.json(countries)
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/locations/search?country=PT&q=bene&limit=20
//
// Ordenação (secção 9 do pedido): 1) correspondência exacta, 2) prefixo,
// 3) população, 4) nome. Feito em memória sobre um lote candidato (nunca
// mais do que MAX_CANDIDATES linhas), porque Postgres não tem uma forma
// directa de expressar "startsWith exacto vem primeiro, depois por
// população" sem uma expressão CASE — mais simples e igualmente correcto
// fazer isto em JS sobre um lote já pequeno (filtrado por país+prefixo).
const MAX_RESULTS = 20
const MAX_CANDIDATES = 200
const MIN_QUERY_LENGTH = 2

router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const country = normalizeCountryCode(typeof req.query.country === 'string' ? req.query.country : undefined)
    const rawQuery = typeof req.query.q === 'string' ? req.query.q : ''
    const query = normalizeLocationName(rawQuery)
    const limit = Math.min(MAX_RESULTS, Math.max(1, Number(req.query.limit) || MAX_RESULTS))

    if (!country) return res.status(400).json({ error: 'Parâmetro country é obrigatório.' })
    if (query.length < MIN_QUERY_LENGTH) {
      return res.status(400).json({ error: `Escreve pelo menos ${MIN_QUERY_LENGTH} caracteres.` })
    }

    // Pesquisa por prefixo sobre normalizedName (índice
    // [countryCode, normalizedName] — ver schema.prisma) cobre o nome
    // principal; alternateNames (texto livre, sem índice dedicado) é
    // filtrado depois em memória sobre o lote já candidato — aceitável
    // porque o lote já vem limitado por país+prefixo do nome principal
    // OU por conter o termo em qualquer posição de alternateNames.
    const candidates = await (prisma as any).geoLocation.findMany({
      where: {
        countryCode: country,
        active: true,
        OR: [
          { normalizedName: { startsWith: query } },
          { alternateNames: { contains: rawQuery.trim(), mode: 'insensitive' } },
        ],
      },
      select: { ...PUBLIC_LOCATION_SELECT, normalizedName: true, population: true },
      take: MAX_CANDIDATES,
    })

    const scored = candidates.map((loc: any) => {
      const exact = loc.normalizedName === query
      const prefix = loc.normalizedName.startsWith(query)
      return { loc, exact, prefix }
    })

    scored.sort((a: any, b: any) => {
      if (a.exact !== b.exact) return a.exact ? -1 : 1
      if (a.prefix !== b.prefix) return a.prefix ? -1 : 1
      const popA = a.loc.population != null ? Number(a.loc.population) : 0
      const popB = b.loc.population != null ? Number(b.loc.population) : 0
      if (popA !== popB) return popB - popA
      return a.loc.name.localeCompare(b.loc.name)
    })

    const results = scored.slice(0, limit).map((s: any) => toPublicLocation(s.loc))
    res.json({ results })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/locations/:id — detalhe de uma localidade (usado depois de
// seleccionar uma opção do autocomplete, para confirmar/mostrar). Mesmo
// shape público — sem coordenadas.
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const location = await (prisma as any).geoLocation.findUnique({
      where: { id: req.params.id },
      select: PUBLIC_LOCATION_SELECT,
    })
    if (!location || !location.name) return res.status(404).json({ error: 'Localidade não encontrada.' })
    res.json(toPublicLocation(location))
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// ─── Admin (secção 20 do pedido) — ferramentas mínimas, não uma
// plataforma GIS completa ─────────────────────────────────────────────

// GET /api/locations/admin/search — igual a /search, mas para admin
// corrigir perfis (nunca exige o mínimo de 2 caracteres do público, e
// devolve também `active`, para o admin conseguir encontrar localidades
// já desactivadas).
router.get('/admin/search', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const country = normalizeCountryCode(typeof req.query.country === 'string' ? req.query.country : undefined)
  const query = normalizeLocationName(typeof req.query.q === 'string' ? req.query.q : '')
  const where: any = {}
  if (country) where.countryCode = country
  if (query) where.normalizedName = { contains: query }
  const locations = await (prisma as any).geoLocation.findMany({
    where, take: 50, orderBy: [{ countryCode: 'asc' }, { name: 'asc' }],
  })
  res.json({ locations: locations.map((loc: any) => ({ ...loc, label: buildLocationLabel(loc) })) })
})

// GET /api/locations/admin/profiles-without-reference — perfis que ainda
// não têm homeLocationId (só city/country legacy, ou nada), para o admin
// conseguir priorizar correcções manuais.
router.get('/admin/profiles-without-reference', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const take = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
  const profiles = await (prisma as any).profile.findMany({
    where: { homeLocationId: null },
    select: { id: true, displayName: true, city: true, country: true, type: true, status: true },
    take,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ profiles })
})

// PUT /api/locations/admin/profiles/:id/location — corrige manualmente a
// localidade de referência de um perfil, ignorando o cooldown (secção 12
// do pedido: "admin pode corrigir"). Nunca gera automaticamente uma
// correspondência quando há ambiguidade — quem decide aqui é sempre uma
// pessoa, a ver os resultados de /admin/search.
const adminLocationSchema = z.object({
  homeLocationId: z.string().nullable(),
  customLocality: z.string().max(120).optional().nullable(),
})

router.put('/admin/profiles/:id/location', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  try {
    const data = adminLocationSchema.parse(req.body)
    const profile = await (prisma as any).profile.findUnique({ where: { id: req.params.id } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' })
    if (data.homeLocationId) {
      const location = await (prisma as any).geoLocation.findUnique({ where: { id: data.homeLocationId } })
      if (!location) return res.status(400).json({ error: 'Localidade inválida.' })
    }
    const updated = await (prisma as any).profile.update({
      where: { id: req.params.id },
      data: {
        homeLocationId: data.homeLocationId,
        ...(data.customLocality !== undefined && { customLocality: data.customLocality }),
        homeLocationUpdatedAt: new Date(),
      },
    })
    await logAdminAction(req.userId!, 'UPDATE_PROFILE_LOCATION', 'profile', req.params.id, {
      previousData: { homeLocationId: profile.homeLocationId }, newData: data, ipAddress: req.ip,
    })
    res.json({ profile: updated })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/locations/admin/:id/deactivate — desactiva uma localidade
// inválida (nunca apaga — outros perfis/travel modes podem referenciá-la;
// desactivar só a tira da pesquisa/import futuro, mantendo a FK íntegra).
router.put('/admin/:id/deactivate', requireAdmin('catalog'), async (req: AuthRequest, res: Response) => {
  const location = await (prisma as any).geoLocation.update({
    where: { id: req.params.id }, data: { active: false },
  }).catch(() => null)
  if (!location) return res.status(404).json({ error: 'Localidade não encontrada.' })
  await logAdminAction(req.userId!, 'DEACTIVATE_GEO_LOCATION', 'geo_location', req.params.id, { ipAddress: req.ip })
  res.json({ location })
})

export default router
