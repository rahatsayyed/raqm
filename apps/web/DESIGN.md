# Design System: Raqm Marketing Site

Light, bento, ink-tinted. One sans family, one swappable palette. The palette is a single config line; everything else is palette-agnostic.

## Tokens (semantic, never colour names)

Defined in `src/app/globals.css` (`@theme static inline`), values come from `src/styles/palettes/<name>.css`.

| Token | Utility | Role |
|---|---|---|
| canvas | `bg-canvas` | page background |
| surface | `bg-surface` | cards, inputs |
| surface-sunken | `bg-surface-sunken` | wells, hovered chips |
| ink / ink-muted / ink-subtle | `text-ink` ... | headings / body / labels |
| line | `border-line`, `.hairline` | 1px hairline |
| ring | `ring-ring` | focus ring |
| brand / brand-ink / brand-soft | `bg-brand text-brand-ink` | primary action, text on it, tint |
| inverse / inverse-ink / inverse-line | `bg-inverse` ... | dark panels, footer |
| positive / warning / negative | `text-positive` ... | status |
| shadow-ink (rgb triplet, not a utility) | | tints every shadow |

Legacy names (`bg`, `surface-raised`, `border-subtle`, `ink-headline`, `ink-body`, `ink-label`, `accent-primary`, `accent-deep`, `notice`, `error-muted`) still resolve onto the semantic tokens. Do not use them in new code.

## Swap or add a palette

1. Copy `src/styles/palettes/moss.css` to `<name>.css`, scope it `:root[data-palette="<name>"]`, change the values.
2. Add `@import "../styles/palettes/<name>.css";` in `globals.css` and the name to `PALETTES` in `src/styles/palette.config.ts`.
3. Set `ACTIVE_PALETTE` in `palette.config.ts`.

In dev a floating chip (bottom, left-16) switches palettes live and remembers the choice in localStorage. It is not in production builds.

Every palette must pass WCAG AA: ink, ink-muted and ink-subtle on canvas, surface and surface-sunken; brand-ink on brand; brand on brand-soft; inverse-ink on inverse.

## Radius

`pill` 999 (every clickable thing) / `card-lg` 32 (footer CTA card) / `container` 24 / `cell` 16 / `chip` 12 / `tag` 8. Nested radius = outer minus padding. Legacy `outer/inner/cta/dot` map to container/cell/pill/tag.

## Borders, shadows, layout

- Border: 1px `line`. Ring: `shadow-ring` (ink at 10%). Cell grids use a 2px gap (`gap-cell`).
- Shadows: `shadow-1` to `shadow-4`, always ink-tinted, never pure black, max four levels.
- Column `max-w-col` 964px, wide `max-w-wide` 1200px. Section padding `py-section` 80px, `py-section-lg` 128px. 4pt spacing rhythm.

## Type

Geist (400/500/600) for display and body, JetBrains Mono for numerals and code. Utilities: `text-h1` 62/66, `text-h2` 42/48, `text-h3` 18/22, `text-lead` 20/24; tracking -1%; h1 and h2 are fluid on mobile. Hierarchy by size and ink value, not weight jumps. No forced italics.

## Motion

`--ease-out` cubic-bezier(.16,1,.3,1), `--ease-standard` cubic-bezier(.4,0,.2,1); durations 150/200/350/650ms (`--dur-fast/base/slow/reveal`). `.reveal` rises 14px and fades, 70ms stagger via `style={{'--i': n}}`, toggled by `.is-revealed`; disabled under `prefers-reduced-motion`. Intro gate (`data-intro`, `sessionStorage raqm-intro`), Lenis and GSAP stay as they are.

## Component notes

Footnote markers on the hero and bento notes are numbered in reading order (01, 02 ...); renumber when a section is added or removed.
