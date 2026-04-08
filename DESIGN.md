# Design System: FITALL

> **Base source**: Apple (design-md/apple) — chosen as the closest match to Nike Training Club / Strava / Strong aesthetic (white-base, bold type, single blue accent).  
> **Colors adapted** to FITALL brand: base `#FFFFFF`, accent `#0066FF`, background `#F8F9FA`, text `#0A0A0A`.

---

## 1. Visual Theme & Atmosphere

FITALL's interface is a light, high-contrast fitness companion that keeps the athlete's data front and center. The design philosophy is "performance clarity" — the UI steps back so that workout numbers, progress charts, and booking flows command full attention. Every surface is either pure white or a barely-there warm gray (`#F8F9FA`), creating a clinical precision that mirrors the discipline of training itself. The only chromatic presence is FITALL Blue (`#0066FF`), reserved for interactive elements and live data — it fires like a starting pistol against the white field.

Typography is bold and decisive. Headlines drop to extremely tight line-heights (1.07–1.14) and use negative letter-spacing, echoing the compressed readouts on a GPS watch. Body text stays compact and functional — this is a training log, not a magazine.

Geometry follows Apple's pill language: primary CTAs use full-radius pills; cards use 16px–20px radius for a softer, modern feel. The overall impression is closer to Nike Training Club than to a clinical health app — confident, uncluttered, ready.

**Key Characteristics:**
- Light-native theme (`#FFFFFF` / `#F8F9FA`) — UI recedes behind the athlete's data
- FITALL Blue (`#0066FF`) as singular chromatic accent — interactive, live, actionable
- Inter / system-ui with optical sizing; tight line-heights at display scale
- Pill CTAs (9999px) and 16px–20px card radius — rounded and touch-optimized
- 8px base spacing grid with generous section breathing room
- Soft shadows (`rgba(0,0,0,0.06)` / `rgba(0,0,0,0.10)`) — elevation without heaviness
- Dark session overlay card (`#0A0A0A`) for workout-in-progress stats

---

## 2. Color Palette & Roles

### Primary Brand
- **FITALL Blue** (`#0066FF`): Primary brand accent — active states, CTAs, live data, progress indicators
- **White** (`#FFFFFF`): Card and component surface — the dominant field
- **Background** (`#F8F9FA`): Page / screen background — warm off-white

### Text
- **Primary** (`#0A0A0A`): `--text-primary`, headlines, labels, all high-emphasis text
- **Secondary** (`#6B7280`): Supporting copy, metadata, inactive nav
- **Tertiary** (`#9CA3AF`): Placeholders, disabled, timestamps
- **Inverse** (`#FFFFFF`): Text on dark surfaces (session card, dark CTAs)

### Accent Tints
- **Blue 50** (`#EFF6FF`): Low-emphasis blue fill — previous-record cards, info banners
- **Blue 100** (`#DBEAFE`): Hover / pressed state on light blue surfaces
- **Blue 600** (`#0052CC`): Pressed / active state of primary blue elements

### Semantic
- **Success Green** (`#22C55E`): PR badge, completion states, today marker on calendar
- **Warning Amber** (`#F59E0B`): Pending approval badges
- **Error Red** (`#EF4444`): Error text, destructive actions
- **Info Blue** (`#539DF5`): Informational banners (reuses system-blue family)

### Surface & Border
- **Surface White** (`#FFFFFF`): Card backgrounds
- **Surface Gray** (`#F8F9FA`): Screen background, alternate sections
- **Surface Subtle** (`#F3F4F6`): Hover state on list items, input backgrounds
- **Border Default** (`#E5E7EB`): Card outlines, dividers
- **Border Strong** (`#D1D5DB`): Input borders, focused rings

### Dark Overlay (Workout Session Card)
- **Session Dark** (`#0A0A0A`): Background of the in-session stats banner
- **Session Surface** (`#1C1C1E`): Elevated elements within dark banner
- **Session Muted** (`#6B7280`): Label text on dark banner

### Shadows
- **Subtle** (`rgba(0,0,0,0.04) 0px 1px 3px, rgba(0,0,0,0.06) 0px 1px 2px`): Cards, default elevation
- **Medium** (`rgba(0,0,0,0.08) 0px 4px 12px`): Modals, bottom sheets
- **Strong** (`rgba(0,0,0,0.16) 0px 8px 24px`): Toasts, overlays, RestTimer bar
- **Focus Ring** (`0 0 0 3px rgba(0,102,255,0.25)`): Keyboard focus outline

---

## 3. Typography Rules

### Font Stack
```
--font-sans: "Inter", "Helvetica Neue", "Arial", "Hiragino Sans",
             "Hiragino Kaku Gothic ProN", "Meiryo", "MS Gothic", sans-serif;
```
Inter Variable (weight 100–900) is preferred. All weights are rendered at the correct optical size.

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|--------|-------------|----------------|-------|
| Display | 32px | 900 (Black) | 1.07 | -0.04em | Session totals, PRs, hero numbers |
| H1 | 24px | 800 (ExtraBold) | 1.10 | -0.02em | Page titles |
| H2 | 20px | 700 (Bold) | 1.20 | -0.01em | Section headings |
| H3 | 16px | 700 (Bold) | 1.30 | normal | Card headings, exercise names |
| Body Large | 16px | 400 (Regular) | 1.50 | normal | Primary body copy |
| Body | 14px | 400 (Regular) | 1.50 | normal | Secondary body, list items |
| Label | 14px | 600 (SemiBold) | 1.00 | 0.01em | Button labels, nav items |
| Caption | 12px | 500 (Medium) | 1.50 | normal | Metadata, timestamps |
| Micro | 10px | 600 (SemiBold) | 1.33 | 0.08em | Badges, tags — `text-transform: uppercase` |

### Principles
- **Tight at display scale**: All text ≥ 24px uses negative letter-spacing. Numbers in workout stats (weight, reps, timer) use `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum"`.
- **Bold / regular binary**: Most text is either 700+ (heading) or 400 (body). 600 is used for labels and secondary emphasis. Avoid 300 or 500 as primary text weights.
- **Japanese support**: Full CJK fallback stack. Line breaks follow `word-break: keep-all` for Korean; no additional rules needed for Japanese with Inter fallback.
- **Minimum size**: 12px on mobile. Never below 10px (Micro badges only).

---

## 4. Component Stylings

### Buttons

**Primary (Filled Blue)**
- Background: `#0066FF`
- Text: `#FFFFFF`, 14px weight 700
- Padding: 0 24px
- Height: 56px (minimum touch target)
- Radius: 9999px (full pill) or 16px (square-pill variant)
- Hover: `#0052CC`; Active: scale(0.97); Disabled: opacity 40%
- Use: Primary CTAs — "セットを追加", "リクエストを送る", "承認"

**Secondary (Outlined)**
- Background: transparent
- Text: `#0A0A0A`, 14px weight 700
- Border: `1.5px solid #E5E7EB`
- Padding: 0 24px; Height: 56px; Radius: 9999px
- Hover: `#F8F9FA` background
- Use: Secondary actions — "拒否", cancel

**Ghost (Text-only)**
- Background: transparent; Text: `#6B7280` weight 600
- No border; Height: 44px
- Use: "← 種目に戻る", "スキップ", "ログアウト"

**Dark (Session)**
- Background: `#0A0A0A`; Text: `#FFFFFF`
- Padding: 0 24px; Height: 56px; Radius: 16px
- Use: Session-critical actions — in-workout buttons on dark cards

**Destructive**
- Background: `#FEF2F2`; Text: `#EF4444`; Border: `1.5px solid #FECACA`
- Radius: 16px; Height: 48px
- Use: Delete, cancel-booking

### Cards

**Default Card**
- Background: `#FFFFFF`
- Border: `1px solid #E5E7EB`
- Radius: 20px
- Shadow: Subtle (`rgba(0,0,0,0.04) 0px 1px 3px, rgba(0,0,0,0.06) 0px 1px 2px`)
- Padding: 16px–20px
- Use: Booking rows, exercise items, client cards

**Session Stats Banner (Dark)**
- Background: `#0A0A0A`
- Text: `#FFFFFF`; Secondary: `#6B7280`
- Radius: 20px; Padding: 20px
- Internal divider: `1px solid rgba(255,255,255,0.08)`
- Use: Workout-in-progress header showing time / volume / sets

**Previous Record Card (Blue Tint)**
- Background: `#EFF6FF`
- Border: `1px solid #DBEAFE`
- Radius: 20px; Padding: 16px
- Text: `#1E40AF` (heading), `#1D4ED8` (data), `#3B82F6` (tags)
- Use: "前回の記録" display in WorkoutLogger

**Sales / Stat Card (Dark Accent)**
- Background: `#0A0A0A`; Text: `#FFFFFF`
- Radius: 20px; Padding: 20px
- Use: "今月の売上" large figure card on Trainer Dashboard

### Inputs & Steppers

**Text Input**
- Background: `#F8F9FA`
- Border: `1.5px solid #E5E7EB`; Focus: `1.5px solid #0066FF` + focus ring
- Height: 56px; Radius: 14px; Padding: 0 16px
- Font: 16px weight 400, `#0A0A0A`
- Placeholder: `#9CA3AF`

**Numeric Stepper (WorkoutLogger)**
- Decrement button: `#F3F4F6` background, `#0A0A0A` text, 12px radius, 56×64px
- Value field: `#F8F9FA` background, 96×64px, 28px weight 900, center-aligned, `tabular-nums`
- Increment button: `#0A0A0A` background, `#FFFFFF` text, 12px radius, 56×64px
- Step weight: 2.5 for kg, 1 for reps

**Select / Dropdown**
- Height: 56px; Background: `#F8F9FA`; Border: `1.5px solid #E5E7EB`
- Radius: 14px; Focus: `1.5px solid #0066FF`

### Navigation

**Bottom Tab Bar**
- Background: `#FFFFFF`; Border-top: `1px solid #E5E7EB`
- Height: 64px + safe area inset
- Active icon+label: `#0066FF`, 10px weight 600
- Inactive icon+label: `#9CA3AF`, 10px weight 500
- Active indicator: 3px × 20px blue dot above label

**Notification Badge**
- Background: `#EF4444`; Size: 8px (dot) or 18px (count)
- Position: top-right of icon, 2px inset

### Tags & Status Badges

| Status | Background | Text |
|--------|------------|------|
| 未承認 (pending) | `#FEF3C7` | `#92400E` |
| 確定 (confirmed) | `#DCFCE7` | `#166534` |
| キャンセル (cancelled) | `#F3F4F6` | `#6B7280` |
| 完了 (completed) | `#EFF6FF` | `#1E40AF` |

All badges: 6px radius, padding 2px 10px, 12px weight 600.

### Charts

- Background container: `#0A0A0A` (dark) with 20px radius
- Grid lines: `#262626` stroke, dashed
- Axis text: `#6B7280`, 10–11px
- Primary data line/bar: `#0066FF` (adapted from green in previous implementation)
- Tooltip: `#1C1C1E` background, `#FFFFFF` text, 8px radius, no border
- Dot: `#0066FF` fill, r=3 default / r=5 active
- Body weight secondary line (body fat %): `#F59E0B`

> **Note:** Update existing chart implementations — replace `#00ff88` (previous accent) with `#0066FF` to align with brand.

### Rest Timer Bar (RestTimer)
- Container: `#0A0A0A`, 20px radius, Strong shadow
- Position: `fixed`, bottom 80px (above tab bar), inset-x 16px, z-index 40
- Circular track: `#374151` (empty), `#0066FF` (progress) — adapted from green
- Inner timer text: 11px weight 900, `#FFFFFF`
- Label: 11px weight 500, `#6B7280`
- Skip button: `#1C1C1E` background, `#FFFFFF` text, 9999px radius

### Toast Notification
- Background: `#0A0A0A`; Text: `#FFFFFF`
- Checkmark / PR icon: `#22C55E`
- Position: fixed top-5 left-1/2 -translate-x-1/2
- Radius: 9999px (pill); Padding: 12px 20px
- Shadow: Strong; Animation: `fade-in` 0.2s ease-out

### Calendar (WorkoutCalendar)
- Container: white card, 20px radius, Default shadow
- Worked day: `#0A0A0A` background, `#FFFFFF` text, 32px circle
- Today (worked): `#22C55E` background, `#FFFFFF` text
- Today (not worked): `2px ring #0A0A0A`, `#0A0A0A` text
- Sunday: `#EF4444` text; Saturday: `#3B82F6` text
- Streak number: Display weight (900) `#0A0A0A`; flame emoji precedes

---

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

### Mobile-First Grid
- Screen padding: 16px (horizontal)
- Max content width: 640px (centered on tablet+)
- Bottom navigation: 64px + env(safe-area-inset-bottom)
- Top header: 56px

### Section Rhythm
- Between major sections: 24px gap
- Card internal padding: 16px (compact) / 20px (default) / 24px (spacious)
- Icon + label stacks: 8px gap
- Form field stacks: 12px gap

### Whitespace Philosophy
- **Data breathing room**: Workout numbers and chart data need generous surrounding space — a set row gets 14px vertical padding so the eye can scan without crowding.
- **Section rest**: Each screen section is separated by 24px minimum. On the history page, major sections (calendar, chart, list) have 24px gaps.
- **Dark card prominence**: The session stats dark banner occupies the full card width — it becomes the visual anchor at the top of the workout screen, analogous to a GPS device readout.

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (0) | `#F8F9FA` screen background | Deepest layer |
| Surface (1) | `#FFFFFF` + Subtle shadow | Cards, sheets |
| Elevated (2) | `#FFFFFF` + Medium shadow | Dropdowns, hover cards |
| Dialog (3) | `#FFFFFF` + Strong shadow | Modals, bottom sheet |
| Overlay (4) | `rgba(0,0,0,0.4)` backdrop | Full-screen overlays |
| Fixed (5) | Strong shadow | Toast, RestTimer — always on top |

**Shadow Philosophy**: FITALL uses soft shadows on a white field. A subtle 4px / 3px shadow gives cards just enough lift to be distinct without the dramatic depth of a dark-theme app. Heavier shadows (Medium/Strong) are reserved for temporary surfaces — toasts, timers, overlays — that need to feel "above" the page.

---

## 7. Do's and Don'ts

### Do
- Use `#F8F9FA` for screen backgrounds — never pure white at the page level; cards sit on the gray
- Apply `#0066FF` only for interactive, live, or actionable elements — never decorative fills
- Give every tappable element a minimum 56px height (48px absolute minimum)
- Use the dark session banner (`#0A0A0A`) for live workout stats — it creates urgency and focus
- Use `tabular-nums` and `font-feature-settings: "tnum"` for all numeric readouts
- Use `#EFF6FF` / `#DBEAFE` tint cards for "previous record" and info states — avoid raw blue on white
- Alternate white cards on `#F8F9FA` background to create natural row separation without dividers
- Use `22C55E` green exclusively for success, PR badge, and calendar "worked today" marker

### Don't
- Don't use `#0066FF` as a background fill on large surfaces — it's an accent, not a base
- Don't use light gray text (`#9CA3AF`) for primary content — minimum `#6B7280` for secondary
- Don't add borders to cards that already have a shadow — pick one (border OR shadow, not both, unless the subtle border + subtle shadow combo is intentional)
- Don't use `#00ff88` (previous accent) anywhere — it has been replaced by `#0066FF`
- Don't skip the dark session banner for in-workout screens — the contrast shift signals "session active"
- Don't use rounded corners smaller than 12px for interactive elements on mobile
- Don't use more than two font weights on a single card — bold + regular is sufficient

---

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | < 640px | Single column, bottom nav, full-width cards |
| Tablet | 640px–1024px | Centered content (max 640px), bottom nav |
| Desktop | > 1024px | Side nav option, max-width container |

### Collapsing Strategy
- Bottom tab bar: maintained on mobile and tablet; sidebar on desktop
- Cards: full-width on mobile; max 600px centered on wider screens
- Charts: `ResponsiveContainer width="100%"` — auto-fills card
- Numeric Stepper: maintains fixed width (56px buttons, 96px field) — no fluid resize
- Calendar grid: 7-column always; font size scales from 13px → 14px on wider screens

---

## 9. Agent Prompt Guide

### Quick Color Reference
```
Background:    #F8F9FA  (screen)
Surface:       #FFFFFF  (cards)
Text:          #0A0A0A  (primary)
Text Muted:    #6B7280  (secondary)
Accent:        #0066FF  (interactive, live data)
Accent Tint:   #EFF6FF  (low-emphasis blue fills)
Dark Surface:  #0A0A0A  (session stats, dark CTAs)
Success:       #22C55E  (PR, calendar worked day)
Error:         #EF4444  (errors, destructive)
Border:        #E5E7EB
```

### Example Component Prompts
- "Create a workout set row: white card, 20px radius, 14px border #E5E7EB. Left: 'Set 3' 14px weight 500 #6B7280. Right: '82.5kg × 8reps' 14px weight 700 #0A0A0A. Optional 🏆 emoji if PR."
- "Design the session stats banner: #0A0A0A background, 20px radius, 20px padding, white text. Three columns divided by rgba(255,255,255,0.08) separators. Each column: 10px uppercase label #6B7280, 20px font-black number #FFFFFF."
- "Build the primary CTA: #0066FF background, #FFFFFF text, 14px weight 700, 9999px radius, height 56px, full-width. Disabled: opacity 40%."
- "Create the previous-record card: #EFF6FF background, 1px solid #DBEAFE border, 20px radius, 16px padding. Label '前回' 12px bold #1E40AF. Value '80kg × 8rep × 3セット' 14px bold #1D4ED8. Right: 'コピー' button #2563EB bg white text 40px height 14px bold."
- "Design a booking status badge: pending = #FEF3C7 bg #92400E text; confirmed = #DCFCE7 bg #166534 text; 6px radius, 12px weight 600, 2px 10px padding."
- "Create the rest timer: fixed bottom-20 inset-x-4 z-40. #0A0A0A bg 20px radius Strong shadow. Circular SVG: #374151 empty track, #0066FF progress (stroke-dashoffset animated). Skip button: #1C1C1E bg #FFFFFF text 9999px radius height 36px."

### Iteration Guide
1. Start with `#F8F9FA` screen — white cards float on the warm gray field
2. `#0066FF` fires on interactive elements only — every tap destination gets the blue
3. Dark session banner (`#0A0A0A`) signals "workout in progress" — flip to it the moment the first set is saved
4. Pill everything primary (9999px CTA), round everything secondary (16–20px cards)
5. `tabular-nums` on all numeric displays — reps, weights, timers, sales figures
6. `#22C55E` for victory moments only — PR badge, calendar trained day, completion states
7. Soft shadows, never heavy — this is a clinical white-field app, not a dark theater
