# beinge UX DNA — Global UI/UX Rules

**Version**: 0.2.0
**Last updated**: 2026-04-08

> This document defines the non-negotiable UI/UX rules that apply to all screens across all micro apps in beinge. It is the single source of truth for visual design decisions. All implementation MUST conform to these rules.
> Where wireframe files (PNG) conflict with written spec decisions, the spec takes precedence. Where the wireframes add visual detail that the spec is silent on, the wireframes are authoritative.

---

## 1. Viewport & Layout

- The app is **mobile-first**; all layouts are designed for portrait orientation on a ~390 px wide screen.
- Full-height layout uses `100dvh` (dynamic viewport height) to correctly handle mobile browser chrome.
- **Top bar** (fixed): app title + menu button. Height: `56 px`.
- **Bottom nav bar** (fixed): three navigation buttons. Height: `60 px`.
- **Content area**: fills the remaining height between top bar and bottom nav (`calc(100dvh - 56px - 60px)`); scrollable vertically if content overflows.
- No horizontal scrolling on any screen.

---

## 2. Colour Palette & Theming

Themes are applied via CSS custom properties on `<html data-theme="light|dark">`. Values below are read from the wireframes; mark any deviation from these as a design decision requiring explicit approval.

### Base tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-bg` | `#ffffff` | `#101414` | Page background |
| `--color-surface` | `#f5f5f5` | `#1a1e1e` | Card / list-item background |
| `--color-text` | `#111111` | `#f0f0f0` | Primary text |
| `--color-text-muted` | `#888888` | `#666666` | Date labels, secondary text, inactive nav |
| `--color-accent` | `#3ab5ad` | `#3ab5ad` | CTA buttons, active nav, active toggles |
| `--color-accent-fg` | `#ffffff` | `#ffffff` | Text/icon on top of accent background |
| `--color-border` | `#e5e5e5` | `#2c2c2c` | Dividers, input borders |
| `--color-danger` | `#e05252` | `#e05252` | Logout action, destructive states |

### Mood score colour scale

Used for pictogram circles in Overview list items and the Insights graph. All five values MUST be visually distinct; the scale runs low (muted/warm) → high (saturated green).

| Score | Name | Hex (both themes) |
|---|---|---|
| 1 | very-low | `#e05252` |
| 2 | low | `#e8964d` |
| 3 | neutral | `#c8c84a` |
| 4 | good | `#5abf7a` |
| 5 | great | `#3ab55a` |

---

## 3. Typography

System font stack throughout — no custom web fonts in v1.

```
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

| Role | Size | Weight | Notes |
|---|---|---|---|
| Screen heading | `28px` | 700 | Note screen "Hoe voel je je…", Insights "Stemmingsverloop" |
| Section label | `11px` | 600 | ALL-CAPS, `letter-spacing: 0.08em`, muted colour; used for "DEZE WEEK", "DAGELIJKSE INZICHT" |
| Card body / list item text | `15px` | 400 | Entry first line in Overview |
| App title (top bar) | `20px` | 700 | "beinge" centred in top bar |
| Button label | `16px` | 600 | "Opslaan", "Logout", etc. |
| Base / body | `16px` | 400 | Textarea, form fields |

Line height: `1.5` base, `1.6` for textarea.

---

## 4. Navigation

### Top Bar

- Left: hamburger icon `≡` in a `44×44 px` touch target
- Centre: app title **"beinge"** — typographic text, not an image
- Right: reserved / empty in v1
- Background: `--color-bg`; no visible shadow or border — blends with page background

### Bottom Nav Bar

- Three equally-spaced buttons: **Note** | **Overview** | **Insights**
- Each button shows an icon above a text label (both always visible — no icon-only)
- Active state: icon + label in `--color-accent`; small dot indicator below the label
- Inactive state: icon + label in `--color-text-muted`
- Touch target minimum: `44×44 px`
- Background: `--color-bg`; subtle top border `--color-border`

### Top Menu (side drawer)

- Opens as a **full-height left side drawer** (not a top dropdown) on hamburger tap
- Drawer width: ~85% of viewport width
- Header row: "Menu" heading (large, bold) + `×` close button (top right, `44×44 px`)
- Menu items — in order:
  1. **Settings** — icon + label
  2. **Export** — icon + label; tapping opens a date-range picker + format selector (CSV / PDF) before triggering download
  3. **Logout** — icon + label; icon and label use `--color-danger` to signal destructive/exit action
- Closed by tapping the `×`, tapping the overlay, or pressing back
- No navigation links or content cards inside the drawer

---

## 5. Screen Layouts

### Note Screen

Two-column content area:
- **Left column (~70% width)**: screen heading + subtitle + textarea (expands to fill height)
- **Right column (~30% width)**: vertical mood slider, full content-area height

Save button sits below the two-column area: full-width, pill shape (`border-radius: 9999px`), `48 px` height, `--color-accent` background.

Save states:
- Default: "Opslaan"
- Confirmed: "Opslaan ✓" — label change persists for ~2 s then reverts

### Overview Screen

- Search bar pinned below the top bar, above the list; full-width with a leading search icon, `--color-surface` background, `border-radius: 12px`
- Entry list: flat, no date-based grouping
- Each entry card: `border-radius: 12px`, `--color-surface` background, `16px` padding
  - Top: date label in section-label style (ALL-CAPS, muted, see typography)
  - Middle: first line of note in card-body size
  - Bottom row: mood circle (left) + edit pencil icon (right, `--color-text-muted`)
- Mood circle: `32×32 px` filled circle using the mood score colour scale

### Insights Screen

Vertical stack:
1. Section label "DAGELIJKSE INZICHT" (small-caps)
2. Screen heading "Stemmingsverloop"
3. Short descriptive paragraph
4. Aggregate score display (centred badge)
5. "Trend Analyse" subheading + line graph (smooth curve, labelled x-axis by day)
6. "Dieper Inzicht" subheading + generated summary text block

Days with no entry are shown as a gap in the line (no interpolation).

### Export Dialog

Modal overlay (not a new screen). Opens when the user taps "Exporteren" in the top menu.

- Header row: "Exporteren" heading + × close button (`44×44 px` touch target)
- **Van** label + native `<input type="date">` (full width)
- **Tot** label + native `<input type="date">` (full width)
- **"Alles"** quick-preset button (outlined, full width): sets Van → oldest entry date, Tot → yesterday
- **Formaat** label + segmented control: CSV (default) | PDF
- Inline validation area (below date inputs): error or warning text in `--color-danger` or `--color-text-muted`
- **"Downloaden"** primary CTA button (disabled when range invalid or empty; label changes to "Bezig met exporteren..." during generation)
- **"Annuleren"** outlined or text button
- Dismissed by ×, "Annuleren", or tapping the backdrop

### Admin Screen

- Screen heading "Gebruikersbeheer" (large, bold)
- Stats row: two inline stat blocks — total users count, active users count; muted label above number
- Search input: full-width, rounded, leading search icon
- Action row: "Filters" outlined button (left) + "+ Nieuw" filled accent button (right)
- User list: each row is a card (`border-radius: 12px`):
  - Avatar: `40×40 px` circle with coloured background and 2-letter initials; active users get a saturated colour, inactive get a muted gray
  - Name + email (truncated) in two lines
  - Status pill: "Active" (green fill) or "Inactive" (gray fill)
  - Toggle switch on the far right (accent when on, muted when off)
- Pagination: `<` `>` arrow buttons centred below the list
- Admin-only bottom nav: Users | Settings (2 items, not the standard 3)

---

## 6. Interactive Elements

### Vertical Mood Slider (Note screen)

- `<input type="range" orient="vertical">` (Firefox) + CSS `writing-mode: vertical-lr; direction: rtl` (WebKit/Blink) for cross-browser vertical rendering
- Range: 1 (bottom) → 5 (top)
- Track height: at least `200 px` to be thumb-friendly on mobile
- Thumb: `32×32 px` minimum, circular, `--color-accent` fill
- Numeric labels 1–5 displayed alongside the track

### Buttons

- **Primary (CTA)**: pill shape (`border-radius: 9999px`), `--color-accent` background, `--color-accent-fg` text, `48 px` height, full-width within its container
- **Outlined**: `--color-border` border, transparent background, same sizing
- **Danger/Logout**: `--color-danger` text or background depending on context
- Touch target minimum: `44×44 px` for all interactive elements (WCAG 2.5.8)

### Toggle Switch (Admin user list)

- Standard pill toggle: accent colour when on, `--color-border` when off
- Minimum touch target: `44×44 px`

### Text Area (Note screen)

- Expands to fill available column height
- No explicit border in resting state; subtle `--color-border` on focus
- `font-size: 1rem`, `line-height: 1.6`
- No character counter in v1

### Search Bar (Overview, Admin)

- `border-radius: 12px`, `--color-surface` background
- Leading search icon in `--color-text-muted`
- Clears with `×` button that appears when input is non-empty

---

## 7. Feedback & States

- **Loading**: skeleton placeholders (CSS animated shimmer), not spinners
- **Empty state**: illustrated message + call to action (e.g., "Nog geen notities — begin vandaag met loggen")
- **Save feedback**: explicit "Opslaan" button; confirmed state shows "Opslaan ✓" for 2 s
- **Errors**: inline message near the affected element; toast for global errors

---

## 8. Accessibility

- Colour contrast ratio: minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA)
- All interactive elements have visible focus indicators
- `aria-label` on icon-only buttons
- Mood slider: `aria-label="Stemming: [waarde] van de 5"`
- Status toggles: `aria-label="Activeer [naam]"` / `"Deactiveer [naam]"`

---

## 9. Date Display Rules

Entry dates are stored as full UTC timestamps. On screen they are rendered as:

| Condition | Display |
|---|---|
| Date is yesterday (local) | "Gisteren" |
| Any earlier date | "D MMM YYYY" (e.g., "12 mei 2026") |

No clock time is shown in any list view.

---

## 10. UI Strings (Dutch — v1)

All user-facing copy is Dutch. This section is the single source of truth for fixed strings. Variable content (dates, user notes) is not listed here.

### Onboarding Modal

| Key | String |
|---|---|
| `onboarding.heading` | Welkom bij beinge |
| `onboarding.line1` | Schrijf elke dag een korte notitie over hoe je je voelde. |
| `onboarding.line2` | Geef je stemming een score van 1 tot 5 met de schuifregelaar. |
| `onboarding.line3` | Alleen jij kunt jouw notities zien. |
| `onboarding.cta` | Aan de slag → |

### Navigation

| Key | String |
|---|---|
| `nav.note` | Notitie |
| `nav.overview` | Overzicht |
| `nav.insights` | Inzichten |
| `menu.settings` | Instellingen |
| `menu.export` | Exporteren |
| `menu.logout` | Uitloggen |

### Note Screen

| Key | String |
|---|---|
| `note.heading` | Hoe voel je je gisteren? |
| `note.placeholder` | Schrijf hier wat je wilt over je dag... |
| `note.save` | Opslaan |
| `note.saved` | Opgeslagen ✓ |

### Overview Screen

| Key | String |
|---|---|
| `overview.search.placeholder` | Zoek in je notities... |
| `overview.empty` | Nog geen notities — begin vandaag met loggen. |
| `overview.no_results` | Geen notities gevonden voor "[zoekterm]". |

### Insights Screen

| Key | String |
|---|---|
| `insights.heading` | Stemmingsverloop |
| `insights.insufficient_data` | Voeg meer notities toe voor inzichten in je stemmingspatroon. |

### Settings Screen

| Key | String |
|---|---|
| `settings.theme.label` | Weergave |
| `settings.theme.light` | Licht |
| `settings.theme.dark` | Donker |
| `settings.reminder.label` | Dagelijkse herinnering |
| `settings.delete.label` | Verwijder mijn account |
| `settings.delete.confirm` | Weet je het zeker? Dit verwijdert al je notities en kan niet ongedaan worden gemaakt. |
| `settings.delete.confirm_button` | Ja, verwijder alles |
| `settings.delete.cancel_button` | Annuleren |

### Export Dialog

| Key | String |
|---|---|
| `export.heading` | Exporteren |
| `export.from` | Van |
| `export.to` | Tot |
| `export.preset_all` | Alles |
| `export.format` | Formaat |
| `export.submit` | Downloaden |
| `export.submit_loading` | Bezig met exporteren... |
| `export.cancel` | Annuleren |
| `export.error.invalid_range` | De startdatum moet voor de einddatum liggen. |
| `export.error.empty_range` | Geen notities in deze periode. |

### Error & Status

| Key | String |
|---|---|
| `error.generic` | Er is iets misgegaan. Probeer het opnieuw. |
| `error.no_access` | Je hebt geen toegang tot deze app. |
| `error.rate_limit` | Te veel verzoeken. Probeer het over even opnieuw. |

---

## 11. Wireframe Reference

Reviewed wireframes (located at `specs/001-shell-app01-wellbeing/wireframes/app01/`):

| File | Status |
|---|---|
| `note.png` / `note-dark.png` | Reviewed — layout and component patterns extracted |
| `overview.png` / `overview-dark.png` | Reviewed — card pattern and search bar extracted |
| `insight.png` / `insight-dark.png` | Reviewed — screen structure extracted |
| `usermenu.png` / `usermenu-dark.png` | Reviewed — side-drawer pattern extracted; menu items overruled by spec (Settings / Export / Logout) |
| `admin.png` | Reviewed — user list pattern and stats row extracted |

Where wireframe content conflicts with spec decisions (app name, bottom nav count, menu items, score scale), the spec takes precedence and the wireframe PNG is considered outdated.
