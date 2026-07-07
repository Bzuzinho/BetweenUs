// 10.1 — GuideArticle V2 service: slug assignment, the published <->
// publishedAt bridge, and reading-time estimation. Routes (guide.ts)
// delegate here instead of writing `published`/`publishedAt` directly, so
// there's exactly one place that keeps the two fields consistent during
// the gradual migration described on the schema.
import prisma from './prisma'
import { slugify, uniqueSlug } from './slugify'

// 10.2 — best-effort mapping from the old free-text Portuguese categories
// to the new controlled GuideCategory enum, used once by the backfill
// script (scripts/migrateGuideCategories.ts) for any pre-Sprint-10 rows.
// Not exhaustive by construction — anything unmapped falls back to
// PROFILES rather than failing the migration, and is left for an editor
// to manually re-categorize (flagged in that script's output).
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'Casais': 'COUPLES',
  'Comunicação': 'CONSENT',
  'Privacidade': 'PRIVACY',
  'Consentimento': 'CONSENT',
  'Relações': 'OPEN_RELATIONSHIPS',
  'Segurança': 'SAFETY',
  'Perfil': 'PROFILES',
  'Outro': 'PROFILES',
}

const WORDS_PER_MINUTE = 200
export const estimateReadingTime = (body: string): number =>
  Math.max(1, Math.round(body.trim().split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE))

export const generateArticleSlug = async (title: string, excludeId?: string): Promise<string> => {
  const existingRows = await (prisma as any).guideArticle.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { slug: true }
  })
  return uniqueSlug(title, new Set(existingRows.map((r: any) => r.slug)))
}

// The ONLY place `published`/`publishedAt` are written together. Setting
// published=true stamps publishedAt the FIRST time only (re-publishing
// after an edit doesn't reset "how long has this been live"); setting
// published=false clears publishedAt (an unpublished article has no
// current live-since date — its history lives in AdminAction, not here).
export const applyPublishState = (current: { publishedAt: Date | null }, published: boolean) => {
  if (published) {
    return { published: true, publishedAt: current.publishedAt || new Date() }
  }
  return { published: false, publishedAt: null }
}
