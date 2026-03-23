# Ledgr — Brand & Design System

> **Version**: 2.0.0 | **Status**: Canonical — All UI work MUST reference this document first.
> **Breaking change from v1**: Design system replaced with "The Architectural Ledger" (Material You tonal surfaces, Manrope font). Old Inter/border-based tokens are retired. See §2 for new token set.

---

## 1. Product Identity

### Name
**Ledgr** *(pronounced "ledger")* — the silent `e` signals modern simplicity without losing accounting heritage.

### Tagline
*"Your books. Done right."*

### Personality
| Trait | Expression |
|---|---|
| Professional | Clean hierarchy, no decoration for decoration's sake |
| Warm | Rounded corners, human language, not jargon |
| Trustworthy | Consistent patterns, predictable interactions |
| Fast | Minimal chrome, data-first, keyboard-friendly |

### Voice & Tone
- Use plain language: "Amount paid" not "Debit amount"
- Short, direct labels. No tooltips unless genuinely ambiguous.
- Error messages: say what happened + what to do next.
- Success messages: one line, no exclamation marks.

---

## 2. Color Tokens — "The Architectural Ledger"

Design philosophy: **Editorial Asymmetry + Tonal Depth**. Reject the spreadsheet aesthetic. Treat data as physical structure. All colors are CSS custom properties — never use raw hex in component code.

### Surface Hierarchy (tonal layering — the primary depth mechanism)

| Token | Hex | Usage |
|---|---|---|
| `--surface` / `--surface-bright` | `#f9f9ff` | App background |
| `--surface-container-low` | `#f0f3ff` | Input backgrounds, secondary panels, hover states |
| `--surface-container` | `#e7eeff` | Active selections, tab bar background |
| `--surface-container-high` | `#dee8ff` | Strong emphasis surfaces |
| `--surface-container-highest` | `#d8e3fb` | Maximum tonal separation |
| `--surface-container-lowest` | `#ffffff` | Cards, panels, modals, sidebar |

Tonal transitions create visual hierarchy — **never use hard borders between adjacent containers**.

### Primary (blue)

| Token | Hex | Usage |
|---|---|---|
| `--primary` | `#004ac6` | Primary actions, active nav, links |
| `--primary-container` | `#2563eb` | Gradient endpoint, button gradient |
| `--primary-fixed` | `#dbe1ff` | Has-entries calendar cell tint |
| `--primary-fixed-dim` | `#b4c5ff` | Borders on primary-tinted cells |
| `--on-primary` | `#ffffff` | Text/icons on primary backgrounds |
| `--on-primary-fixed` | `#00174b` | Display text on very light primary tint |

### Tertiary (sage green — locked/safe state)

| Token | Hex | Usage |
|---|---|---|
| `--tertiary` | `#3a5c44` | Locked day text, lock icon |
| `--tertiary-fixed` | `#c5eccc` | Salary entry type badge, locked badge bg |
| `--tertiary-fixed-dim` | `#aad0b1` | Locked calendar cell border |
| `--on-tertiary` | `#ffffff` | Text on tertiary buttons |

### Secondary (blue-grey)

| Token | Hex | Usage |
|---|---|---|
| `--secondary` | `#505f76` | Secondary text elements |
| `--secondary-container` | `#d0e1fb` | Settlement entry type badge |
| `--on-secondary-container` | `#54647a` | Text on secondary container |

### Text / On-surface

| Token | Hex | Usage |
|---|---|---|
| `--on-surface` | `#111c2d` | Headings, primary content |
| `--on-surface-variant` | `#434655` | Labels, subtitles, secondary content |
| `--outline` | `#737686` | Disabled / placeholder |
| `--outline-variant` | `#c3c6d7` | Ghost border base color |

### Error / Warning

| Token | Hex | Usage |
|---|---|---|
| `--error` | `#ba1a1a` | Error states |
| `--error-container` | `#ffdad6` | Error message backgrounds |
| `--warning-dim` | `#e6b96b` | Pending review amber accent |

> **Removed tokens** (v1 → v2): `--color-brand`, `--color-ledgr-accent`, `--color-surface-0/1/2`, `--color-border`, `--color-text-primary/secondary`. These are retired. Use Material You surface tokens above.

---

## 3. Typography

Font: **Manrope** (weights 200–800) — loaded via Google Fonts `@import`. Replaces Inter from v1.
`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap');`

### The No-Line Rule
Boundaries are created by **background color shifts and tonal transitions**, never by 1px solid borders. The only permitted "border" is a ghost border: `outline: 1px solid rgba(195, 198, 215, 0.35)` at ≤20% opacity — used sparingly on floating cards only.

### Scale

| Role | Size | Weight | Letter-spacing | Notes |
|---|---|---|---|---|
| Page title | 26px | 800 | -0.02em | Display — tight, heavy |
| Section subtitle | 13px | 500 | +0.02em | `--on-surface-variant` color |
| Section header label | 11px | 800 | +0.08em | UPPERCASE, border-left accent |
| Card KPI value | 28px | 800 | -0.03em | tabular-nums |
| Card label | 12px | 600 | +0.04em | UPPERCASE |
| Nav label (sidebar) | 14px | 500–700 | +0.01em | 700 when active |
| Nav label (bottom) | 10px | 600 | +0.04em | UPPERCASE |
| Body / row text | 14px | 500 | — | Default prose |
| Amount (large) | 16–18px | 800 | -0.02em | tabular-nums |
| Badge / tag | 10px | 800 | +0.05em | UPPERCASE, pill |
| Table header | 10px | 800 | +0.08em | UPPERCASE |

All currency/amount values use `font-variant-numeric: tabular-nums` so columns align.

---

## 4. Spacing & Layout

Base unit: **4px**. All spacing is a multiple of 4.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Tight internal padding |
| `--space-2` | 8px | Between icon and label |
| `--space-3` | 12px | Compact row padding |
| `--space-4` | 16px | Standard padding |
| `--space-5` | 20px | Section gap |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Section vertical gap |
| `--space-12` | 48px | Page top padding |

### Breakpoints

| Name | Min width | Layout |
|---|---|---|
| `mobile` | 0px | Single column, bottom nav |
| `tablet` | 768px | Two column, side panel |
| `desktop` | 1280px | Fixed sidebar + content |

---

## 5. Component Standards

### Cards (tonal containers)
- Background: `--surface-container-lowest` (#ffffff)
- **No border** — ghost border only: `outline: 1px solid rgba(195,198,215,0.35)`
- Border radius: `16px` (`.radius-lg`) for dashboard cards, `12px` (`.radius-md`) for form containers
- Elevation: 0 (no drop shadows)
- Padding: 24px (`--sp-6`)

### Buttons

| Variant | Background | Text | Border |
|---|---|---|---|
| Primary | gradient: `--primary` → `--primary-container` | `--on-primary` | none |
| Secondary | `--surface-container-low` | `--on-surface` | ghost border 20% opacity |
| Tertiary | transparent | `--primary` | none |
| Ghost | transparent | `--primary` | none |
| Danger | `--error-container` | `--error` | none |

- Height: 36px (sm), 44px (default), 52px (login CTA)
- Border radius: `12px` (`--radius-md`) — mandatory
- Font: Manrope 14px / 700, letter-spacing +0.01em
- Active: `transform: scale(0.98)`

### Inputs
- Height: 44px
- Background: `--surface-container-low`
- Border: **none** — ghost border: `outline: 1px solid rgba(195,198,215,0.4)`
- Focus: `outline: 2px solid rgba(0,74,198,0.5)` + background → `--surface-container-lowest`
- Border radius: `12px`
- Font: Manrope 14px / 500

### Status Badges (pills)

| Status | Background | Text |
|---|---|---|
| Draft / Pending Review | `rgba(230,185,107,0.3)` | `#92400e` (amber) |
| Locked | `--tertiary-fixed` | `--tertiary` |
| Primary / Has entries | `--primary-fixed` | `--primary` |
| Neutral | `--surface-container-low` | `--on-surface-variant` |
| Error | `--error-container` | `--error` |
| Settlement | `--secondary-container` | `--secondary` |

- Padding: 3px 10px
- Border radius: 9999px (full pill)
- Font: Manrope 10px / 800, letter-spacing +0.05em, UPPERCASE

---

## 6. Calendar Grid — The Ledgr Signature Component

The fiscal calendar is the most distinctive UI element. Wrapped in a `calendar-container` card (white, `radius-xl`).

- **Grid**: 7-column week grid + 8th column for week totals
- **Cell states** (tonal, no hard borders):

| State | Background | Text color | Indicator |
|---|---|---|---|
| Empty | `--surface-container-low` | `--on-surface-variant` | — |
| Has entries | `rgba(219,225,255,0.6)` (blue tint) | `--primary` | — |
| Pending review | `rgba(230,185,107,0.2)` (amber tint) | `#92400e` | amber dot top-right |
| Locked | `rgba(197,236,204,0.35)` (sage tint) | `--tertiary` | 🔒 emoji top-right |
| Today | blue tint + `outline: 2px solid --primary` | `--primary` | SELECTED ring |
| Future | opacity 0.38, `--surface-container-low` | — | non-interactive |

- **Cell content**: date number (top-left, 12px/700) + amount (bottom-left, 9px/600) when entries > 0
- **Cell radius**: `8px` (`--radius-sm`)
- **Cell gap**: 4px
- **Interaction**: click → slide-right panel (desktop) or slide-up sheet (mobile)
- **Week totals**: 8th column, right-aligned, 72px wide, 10px/700
- **Month total**: footer bar, `--surface-container-low` bg, 18px/800 amount
- **Legend**: below grid, locked/pending/entries/empty dots with uppercase labels
- **Header**: calendar title + Today button + prev/next chevrons

---

## 7. Navigation

### Web (desktop sidebar) — Architectural Ledger style
```
┌─────────────────────────────┐
│  [L]  Ledgr                 │  ← brand icon (gradient square) + logo 22px/800
│       Architectural Ledger  │  ← subtitle 9px/700 UPPERCASE
├─────────────────────────────┤
│  ⊞  Command      ← active  │  ← primary color, bolder weight, surface-container bg
│  📖 Journals               │
│  🗒  Ledger                 │
│  👥 Partners               │
│  📊 Analytics              │
├─────────────────────────────┤
│  ⚙  Settings               │
│ [  +  New Entry  ]          │  ← gradient primary button, full width
└─────────────────────────────┘
```
Sidebar width: 256px. Background: `--surface-container-lowest`. No border-right — tonal separation only.

### Mobile (bottom tabs)
```
[ Command | Journals | Ledger | Analytics | Partners ]
```
Labels: 10px/600 UPPERCASE. Active: `--primary`. Background: `--surface-container-lowest`. Shadow: 1px top at 40% opacity (no hard border).

### Mobile top bar
Sticky header on mobile: Ledgr logo 20px/800, `--primary` color. Background: `--surface-container-lowest`.

Ledgr is **always deployed as a standalone web app** at its own origin (e.g., `ledgr.yourdomain.com`). It is never embedded inside the inventory frontend.

---

## 8. Icons
Use [Lucide](https://lucide.dev/) icon set — already consistent with the inventory module's aesthetic. Size: 16px (inline), 20px (nav), 24px (page actions).

---

## 9. Motion & Animation
- Transitions: 150ms ease-out (state changes), 200ms ease-out (panels/modals)
- Slide-up sheets: 250ms spring (mobile)
- No gratuitous animation. Motion serves communication, not decoration.

---

## 10. What NOT to do
- **No hard borders** — `border: 1px solid` is forbidden on containers. Use ghost borders (`outline: 1px solid rgba(195,198,215,0.35)`) only on floating cards, never between sections
- **No drop shadows** — tonal surface layering provides all elevation
- **No dividers in lists** — use 4px–8px gap between rows, no `border-bottom`
- **No old tokens** — `--color-brand`, `--color-ledgr-accent`, `--color-surface-0/1/2`, `--color-border` are retired; do not use
- **No Inter font** — Manrope only (all weights 200–800)
- **No color outside the defined palette**
- **No icons larger than 24px** in body content
- **Gradients permitted only** on: login hero background, primary buttons, sidebar brand icon — nowhere else
- **No "spreadsheet" look** — no full-width horizontal rules, no alternating row colors (use hover state instead)
