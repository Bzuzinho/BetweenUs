// 10.1/10.2 — SAFE String -> enum/unique-slug migration for GuideArticle,
// same runbook shape as migratePrivateRoomEnums.ts (7.2): this project
// has no staged migration history (`prisma db push --accept-data-loss`
// runs directly against schema.prisma on every boot), so a free String
// `category` column becoming a Postgres enum, and a brand-new NOT NULL
// UNIQUE `slug` column with no data, both need existing rows rewritten
// via raw SQL BEFORE the schema push — otherwise `--accept-data-loss` can
// silently reset the column instead of erroring.
//
// THE SAFE SEQUENCE:
//   1. Deploy this script's code WITHOUT yet pushing the new schema, run
//      it once against the OLD String `category` column and the
//      not-yet-existing `slug` column.
//   2. It rewrites every row's `category` text to a valid GuideCategory
//      label (via guideService.ts's LEGACY_CATEGORY_MAP, unmapped falls
//      back to PROFILES) and computes a unique `slug` from the title for
//      every row that doesn't have one yet.
//   3. THEN run `prisma db push` — category becomes a same-value cast,
//      slug already has real, unique values to satisfy the new
//      constraint.
//
// Idempotent: rows that already have a slug are left untouched; rows
// whose category text already matches a valid enum label are untouched.
import prisma from '../lib/prisma'
import { LEGACY_CATEGORY_MAP } from '../lib/guideService'
import { slugify, uniqueSlug } from '../lib/slugify'

const VALID_CATEGORIES = new Set(['CONSENT', 'COUPLES', 'OPEN_RELATIONSHIPS', 'POLYAMORY', 'PRIVACY', 'SAFETY', 'PROFILES', 'FIRST_MEETINGS', 'PRIVATE_INTERESTS'])

export const migrateGuideArticles = async (): Promise<{ categoriesRewritten: number; slugsAssigned: number; unmapped: string[] }> => {
  // Raw SQL: this runs against columns that may not yet match the
  // Prisma Client's generated types (old deploy, new code) — same
  // reasoning as migratePrivateRoomEnums.ts.
  const rows: Array<{ id: string; title: string; category: string; slug: string | null }> =
    await prisma.$queryRawUnsafe(`SELECT id, title, category, slug FROM guide_articles`)

  const existingSlugs = new Set(rows.map(r => r.slug).filter(Boolean) as string[])
  const unmapped: string[] = []
  let categoriesRewritten = 0
  let slugsAssigned = 0

  for (const row of rows) {
    let newCategory = row.category
    if (!VALID_CATEGORIES.has(row.category)) {
      newCategory = LEGACY_CATEGORY_MAP[row.category] || 'PROFILES'
      if (!LEGACY_CATEGORY_MAP[row.category]) unmapped.push(`${row.id} (${row.category})`)
      await prisma.$executeRawUnsafe(`UPDATE guide_articles SET category = $1 WHERE id = $2`, newCategory, row.id)
      categoriesRewritten++
    }

    if (!row.slug) {
      const slug = uniqueSlug(row.title, existingSlugs)
      existingSlugs.add(slug)
      await prisma.$executeRawUnsafe(`UPDATE guide_articles SET slug = $1 WHERE id = $2`, slug, row.id)
      slugsAssigned++
    }
  }

  return { categoriesRewritten, slugsAssigned, unmapped }
}

if (require.main === module) {
  migrateGuideArticles()
    .then(r => { console.log('GuideArticle migration done:', r); process.exit(0) })
    .catch(e => { console.error('Error:', e.message); process.exit(1) })
}
