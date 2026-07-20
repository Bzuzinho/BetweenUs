# BetweenUs — Visual Guidelines

Status: BRAND.1 normalization (2026-07-20). Single source of truth for the BetweenUs mark going forward.

## 1. Marca

BetweenUs is a private, consent-led platform for adult connections. The visual identity communicates three things: privacy, consent, compatibility. It should read as calm, precise and trustworthy — not loud, not "dating-app generic," not adult-industry coded.

The brand has one official mark: **the two-ring symbol**, already implemented and shipping in the product (`client/src/lib/design.js`, `Logo` component). Every other visual — the landing page, favicons, app icons, social cards — must derive from this same mark. No second mark is permitted.

## 2. Logotipo oficial — dois anéis

Two overlapping circles ("rings"), representing two people (or perspectives) meeting with distinct identities that overlap without merging.

- Left ring: stroke `#4A6B7A` (logoSecondary — muted slate teal)
- Right ring: stroke `#B8A7FF` (primary — soft lavender), opacity `0.75`
- Fill: none (outline only)
- Background: transparent by default; `#0A141A` when a solid background is required (favicons, app icons)

Source files: `brand/logo/betweenus-symbol.svg` (canonical), mirrored at `client/src/lib/design.js` (`Logo` component) and `client/public/favicon.svg`.

**The heart/link symbol previously used on the landing page is retired.** It is not, and has never been, the official mark. Do not reintroduce it in any form (header, hero mockup, footer, favicon, social card, or elsewhere).

## 3. Construção do símbolo

```svg
<svg viewBox="0 0 56 28" xmlns="http://www.w3.org/2000/svg">
  <circle cx="18" cy="14" r="13" fill="none" stroke="#4A6B7A" stroke-width="3.5"/>
  <circle cx="34" cy="14" r="13" fill="none" stroke="#B8A7FF" stroke-width="2.5" opacity="0.75"/>
</svg>
```

- Canvas: 56×28 (2:1 aspect ratio) — always preserve this ratio when scaling.
- Circle radius: 13, centers 16px apart (cx 18 and 34) so the rings overlap by roughly a third of their diameter. Do not widen or narrow the overlap — too little overlap reads as two unrelated circles, too much reads as a single blob.
- Left ring stroke is thicker (3.5) than the right (2.5) — this asymmetry is intentional and part of the mark, not a rendering inconsistency.
- Right ring carries `opacity: 0.75` so the overlap area shows a natural color blend rather than a hard edge.

## 4. Versão horizontal

Symbol + "BetweenUs" wordmark, set in **Manrope, weight 700**.

Two variants, both in `brand/logo/`:

- `betweenus-logo-horizontal-light.svg` — text `#F5F7FA`, for dark backgrounds (default/primary use — matches the app's own background).
- `betweenus-logo-horizontal-dark.svg` — text `#0A141A`, for light backgrounds.
- `betweenus-logo-horizontal.svg` — alias of the light variant (the common case).

In code: `LogoHorizontal` in `client/src/lib/design.js`, prop `variant="light" | "dark"`.

## 5. Versão símbolo

Symbol-only, no wordmark. Use where space is tight (nav bars, tab bars, favicons, app icons, loading states) or where the wordmark appears elsewhere on the same screen.

Files: `betweenus-symbol.svg` (two-tone, default), `betweenus-symbol-monochrome.svg` (single `currentColor` stroke, for contexts that need to inherit a surrounding text color rather than the fixed brand colors — e.g. printed/inverted contexts).

## 6. Área de proteção

Keep clear space around the mark equal to at least the height of one ring (≈13 units in the 56×28 viewBox, i.e. ~25% of the symbol's own height) on all sides. Do not let other UI elements, text, or the viewport edge intrude into this zone.

## 7. Tamanho mínimo

- Symbol alone: 24px height minimum (digital). Below this the ring overlap stops reading clearly.
- Horizontal lockup: 28px height minimum, to keep the wordmark legible.
- Favicon contexts (16×16) are the one exception — see §16.

## 8. Usos incorretos

Do not:
- Recolor the rings outside the two official colors (`#4A6B7A` / `#B8A7FF`), except the monochrome variant.
- Fill the rings solid, add drop shadows, bevels, or 3D effects.
- Stretch the symbol off its 2:1 ratio.
- Reduce the ring overlap to zero (separate circles) or increase it until the rings merge into a single shape.
- Reintroduce the retired heart/link mark anywhere in the product or marketing surfaces.
- Pair the horizontal lockup with a third typeface for "BetweenUs" — it is always Manrope 700.

## 9. Cores oficiais

The app (`client/src/lib/design.js`) is the source of truth for the palette. The landing page must draw from the same tokens — no separate "marketing purple."

| Token | Value | Use |
|---|---|---|
| bg | `#0A141A` | Primary page background |
| bgDeep | `#08080C` | Deepest layer (e.g. blurred header backdrop) |
| surface | `#102129` | Cards, panels |
| elevated | `#172C36` | Raised surfaces, gradient highlight stop |
| input | `#0F1E26` | Form fields |
| border | `#1E3340` | Hairlines, card borders |
| primary | `#B8A7FF` | Buttons, links, active states, right ring |
| primaryDim | `rgba(184,167,255,0.12)` | Tinted icon/tag backgrounds |
| primaryBorder | `rgba(184,167,255,0.30)` | Accent borders |
| text | `#F5F7FA` | Primary text |
| text2 | `#AAB6C2` | Secondary text |
| muted | `#7E8FA3` | Tertiary / de-emphasized text |
| success | `#4ADE80` | Positive states |
| warning | `#FBBF24` | Warnings |
| danger | `#F87171` | Errors, destructive actions |
| teal | `#1D9E75` | Accent (sparingly) |
| logoSecondary | `#4A6B7A` | Left ring only |

A note on buttons specifically: primary buttons are a **flat** `primary` background with `bg` (`#0A141A`) text — never white text on purple, never a gradient. This was corrected on the landing page as part of this normalization (it previously used a purple gradient with white text).

## 10. Tipografia

- **Manrope** (weight 600–700) — logo wordmark, all headings, hero copy.
- **Inter** (weight 400–600) — body copy, UI text, buttons, forms.
- No other typeface. Playfair Display or similar serif faces are not part of the identity and should not appear on primary pages.

## 11. Botões

- Primary: background `primary` (`#B8A7FF`), text `bg` (`#0A141A`), fully rounded (pill), no gradient, no drop shadow beyond a subtle tinted glow (`rgba(184,167,255,0.28)`) on hover.
- Secondary/ghost: transparent or near-transparent background, `1px solid border`, text `text2` or `muted`.

## 12. Cards

Background `surface` (`#102129`) or a subtle `elevated → surface` gradient, `1px solid border`, generous corner radius (12–20px depending on density). Icon badges inside cards use `primaryDim` background with `primary` icon color — not a saturated solid purple circle.

## 13. Inputs

Background `input` (`#0F1E26`), `1.5px solid border`, radius ~12px, text `text`, placeholder `muted`.

## 14. Website vs app

The landing page (`landing-page/`) and the product (`client/`) must look like the same product. Concretely: same background tones, same single `primary` accent (no separate marketing-purple palette), same two typefaces, same logo. The landing page may keep its own decorative flourishes — hero glows, the phone-mockup illustration, its rock/avatar shapes — since these are illustrative, not brand elements; what must not diverge is the palette and the mark.

## 15. Open Graph

`brand/social/og-cover.svg` / `.png` (1200×630): dark gradient background (`bg` → `bgDeep`), a soft `primary`-tinted radial glow, the two-ring symbol, "BetweenUs" in Manrope 700, and the tagline "Meaningful connections begin with trust." / "Private. Consent-led. Compatibility-first." Use the PNG for `og:image` — SVG is not reliably rendered by social crawlers (Facebook, LinkedIn, Twitter/X, Slack, iMessage).

## 16. Favicons / app icons

All in `brand/icons/`, generated from the same symbol on a `#0A141A` background:

- `favicon.svg` — vector, used directly by modern browsers.
- `favicon.ico` — 16/32/48px multi-resolution, for legacy fallback.
- `favicon-16x16.png`, `favicon-32x32.png` — raster fallbacks.
- `apple-touch-icon.png` (180×180), `app-icon-192.png`, `app-icon-512.png` — PWA/home-screen icons.
- `maskable-icon-512.png` — full-bleed background with the symbol confined to the safe zone (inner ~80%) so it survives circular/squircle OS masking without clipping.

At 16px the ring overlap is barely legible — this is expected and accepted for favicon scale; do not attempt to "simplify" the favicon mark into a different shape at small sizes.

## 17. Checklist para novas páginas

Before shipping any new page or marketing surface:

- [ ] Uses the two-ring symbol (or horizontal lockup) — not the retired heart mark, not a new mark.
- [ ] Colors come from the token table in §9 — no ad-hoc purple/indigo hex values.
- [ ] Headings in Manrope, body in Inter — no third typeface.
- [ ] Primary buttons are flat `primary` background with `bg`-colored text.
- [ ] Cards/panels use `surface`/`elevated` + `border`, not a bespoke dark gray.
- [ ] Favicon/OG tags point at the shared assets in `brand/icons/` and `brand/social/`, not a page-local asset.
