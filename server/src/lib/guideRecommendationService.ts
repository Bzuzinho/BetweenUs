// 10.4 — GuideRecommendationService: rule-based contextual article
// suggestions. Deliberately NOT AI-based this sprint (spec: "Não usar IA
// neste sprint para selecionar artigos") — a small fixed table mapping a
// known product context to a GuideCategory (plus optional title keyword
// hints for ranking within that category), same rule-engine spirit as
// ReportPriorityService/ConsentPhasePolicy elsewhere in this codebase.
import prisma from './prisma'

export type GuideContext =
  | 'AGREEMENT_MODE'      // Modo Acordo (Sprint 6) — defining boundaries as a couple
  | 'PHOTO_PRIVACY'       // Soft Reveal / private photo sharing
  | 'SAFETY_CHECKIN'      // scheduling a first meeting / safety check-in
  | 'PRIVATE_INTERESTS'   // discussing fetishes/private interests

interface ContextRule {
  category: string
  // Soft ranking hint only — never a hard filter. An article in the
  // right category with no keyword match still gets recommended, just
  // ranked below one that matches.
  titleKeywords: string[]
}

const CONTEXT_RULES: Record<GuideContext, ContextRule> = {
  AGREEMENT_MODE:    { category: 'COUPLES', titleKeywords: ['limit', 'boundary', 'boundaries', 'acordo', 'limites'] },
  PHOTO_PRIVACY:      { category: 'PRIVACY', titleKeywords: ['photo', 'foto', 'reveal', 'privad'] },
  SAFETY_CHECKIN:      { category: 'SAFETY', titleKeywords: ['meeting', 'encontro', 'first', 'primeiro'] },
  PRIVATE_INTERESTS:   { category: 'PRIVATE_INTERESTS', titleKeywords: ['fetish', 'fetiche', 'interess'] },
}

const publicSelect = { id: true, slug: true, title: true, category: true, summary: true, icon: true, readingTime: true }

export const getRecommendedArticles = async (context: GuideContext, limit = 3, locale = 'pt') => {
  const rule = CONTEXT_RULES[context]
  if (!rule) return []

  const candidates = await (prisma as any).guideArticle.findMany({
    where: { published: true, category: rule.category, locale },
    select: publicSelect,
    orderBy: { sortOrder: 'asc' }
  })

  const scored = candidates.map((a: any) => {
    const titleLower = (a.title || '').toLowerCase()
    const matches = rule.titleKeywords.some(kw => titleLower.includes(kw))
    return { article: a, rank: matches ? 0 : 1 }
  })
  scored.sort((x: any, y: any) => x.rank - y.rank)

  return scored.slice(0, limit).map((s: any) => s.article)
}

// Convenience: valid context keys, for route-level validation.
export const GUIDE_CONTEXTS: GuideContext[] = ['AGREEMENT_MODE', 'PHOTO_PRIVACY', 'SAFETY_CHECKIN', 'PRIVATE_INTERESTS']
