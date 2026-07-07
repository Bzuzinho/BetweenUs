// 10.1/10.9 — shared by GuideArticle and Circle, both newly slug-keyed
// this sprint. Deliberately simple (no external dependency) — strips
// accents, lowercases, replaces anything non-alphanumeric with a single
// hyphen, trims edge hyphens.
export const slugify = (input: string): string =>
  input
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

// Ensures uniqueness against an existing set of slugs (e.g. already in
// the DB) by appending -2, -3, ... — used at create time only; a slug is
// never silently renamed on update once published (stable public URLs).
export const uniqueSlug = (base: string, existing: Set<string>): string => {
  const root = slugify(base) || 'item'
  if (!existing.has(root)) return root
  let n = 2
  while (existing.has(`${root}-${n}`)) n++
  return `${root}-${n}`
}
