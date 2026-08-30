---
name: Synapse
description: The Obsidian Command Console for personal execution and resource auditing.
colors:
  bg: "oklch(0.12 0.01 260)"
  surface: "oklch(0.15 0.01 260)"
  surface-subtle: "oklch(0.13 0.01 260)"
  surface-pure: "oklch(0.10 0.01 260)"
  border: "oklch(0.28 0.01 260 / 0.7)"
  border-strong: "oklch(0.32 0.01 260 / 0.9)"
  text-primary: "oklch(0.96 0.01 260)"
  text-secondary: "oklch(0.75 0.01 260)"
  text-muted: "oklch(0.62 0.01 260)"
  todo: "oklch(0.68 0.16 265)"
  todo-hover: "oklch(0.72 0.18 265)"
  expense: "oklch(0.74 0.14 165)"
  expense-hover: "oklch(0.78 0.16 165)"
  trade: "oklch(0.66 0.15 35)"
  trade-hover: "oklch(0.72 0.17 35)"
  success: "oklch(0.74 0.14 165)"
  danger: "oklch(0.65 0.15 25)"
  warning: "oklch(0.78 0.12 85)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.015em"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  default: "20px"
  pill: "9999px"
  extreme: "42px"
  radius-3xl: "32px"
  radius-2xl: "24px"
spacing:
  unit: "8px"
components:
  button-primary:
    backgroundColor: "{colors.todo}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.default}"
    padding: "10px 24px"
  button-primary-hover:
    backgroundColor: "{colors.todo-hover}"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.default}"
    padding: "16px"
  input-text:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
---

# Design System: Synapse

## Overview

**Creative North Star: "The Obsidian Command Console"**

Synapse is structured as a premium, high-fidelity telemetry interface. Grounded in a dark Obsidian palette, it uses precise geometric layouts, subtle borders, and neon cyber-glow accents to serve as an executive terminal for personal metrics. The user experience balances tactical clarity with visual depth, feeling fast, responsive, and carefully crafted.

Every visual element represents utility: status markers light up with periwinkle, mint, or coral; values render in clean geometric tabular numerals; structures load seamlessly without layout shifts. It is an interface engineered for performance.

**Key Characteristics:**
- Deep mineral and Obsidian backdrops, never pure solid blacks.
- Heavy corner rounding (20px) on panels and pills to soften the high-density layout.
- Cyan-periwinkle, mint, and terracotta accents mapped to distinct life sectors (Tasks, Expenses, Trades).
- Soft ambient shadows and glowing overlays that respond dynamically to user hover actions.

## Colors

The palette relies on a deep Obsidian neutral ramp highlighted by vibrant status glows.

### Primary
- **Electric Periwinkle** (`oklch(0.68 0.16 265)`): Primary interactive actions, task execution statuses, and default brand outlines.

### Secondary
- **Cyber Mint** (`oklch(0.74 0.14 165)`): Expense auditing highlights, positive PnL markers, and healthy biological states.

### Tertiary
- **Coral Terracotta** (`oklch(0.66 0.15 35)`): Trade analysis data, position metrics, and risk highlights.

### Neutral
- **Obsidian Black** (`oklch(0.12 0.01 260)`): Deepest canvas ground.
- **Card Obsidian** (`oklch(0.15 0.01 260)`): Panels, charts, and card container surfaces.
- **Translucent Slate** (`oklch(0.13 0.01 260)`): Backgrounds for menu lists, tables, and side navigation drawers.
- **Crisp Silver** (`oklch(0.96 0.01 260)`): High-contrast primary reading text.
- **Balanced Slate** (`oklch(0.75 0.01 260)`): Subdued body copy.
- **Dark Slate** (`oklch(0.62 0.01 260)`): Micro-labels, disabled values, and placeholders.

### Named Rules
**The Containment Rule.** Accents (Periwinkle, Mint, Coral) represent functional status or active focus only. Interactive controls use these for active hover/states; background borders and panels stay neutral.
**The OKLCH Rule.** All new system colors must be defined in the OKLCH space to maintain predictable luminance ramp transitions.

## Typography

**Display Font:** Plus Jakarta Sans
**Body Font:** Inter
**Label/Mono Font:** JetBrains Mono

Typography is geometric, highly readable, and structured for numerical scannability.

### Hierarchy
- **Display** (weight 800, `2.25rem`, line-height 1.15): Page titles, dashboard metrics.
- **Headline** (weight 700, `1.5rem`, line-height 1.2): Module headers, major card titles.
- **Title** (weight 600, `1.125rem`, line-height 1.3): Table section headers, settings labels.
- **Body** (weight 400, `1rem`, line-height 1.5): Descriptive copy, notes, form labels (max measure 70ch).
- **Label** (weight 600, `0.75rem`, letter-spacing `0.08em`, uppercase): Overlines, tabular headers, status tags.

### Named Rules
**The 12px Floor Rule.** Micro-labels and tag subscripts must not scale below `0.75rem` (12px) to ensure clean rendering and readability on high-density Obsidian grounds.

## Layout

Synapse utilizes a responsive grid layout with a base `8px` spacing unit.
- **Viewports**: Mobile (320px–767px), Tablet (768px–1023px), and Desktop (1024px+).
- **Grid Layout**: Bento-style panels that stack vertically on mobile and reflow horizontally on desktop viewports.
- **Notch Padding**: Explicitly honors Safe Area constraints via iOS environmental safe-area variables (`pt-safe-top`, `pb-safe-bottom`).

## Elevation & Depth

Surfaces are mostly flat at rest, utilizing thin borders to define hierarchy, but rise visually during user interaction.

### Shadow Vocabulary
- **Card Focus Shadow** (`box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5)`): Soft ambient drop shadow applied to elevated cards on hover.
- **Overlay Drop Shadow** (`box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6)`): Dense shadow for modals and absolute dropdown layers.

### Named Rules
**The Hover Lift Rule.** Active cards translate upward (`translate-y-[-1px]`) and transition their borders to `border-strong` while scaling up their shadow index.

## Shapes

The interface features rounded geometry to contrast its technical dark palette.
- **Default Corner**: `20px` radius on all standard cards, dashboard grids, and panels.
- **Large Corner**: `32px` / `42px` radius for outer app frames.
- **Pills**: `9999px` full-rounded pills for form fields, search inputs, tags, and select toggles.

## Components

### Buttons
- **Shape**: Rounded default (`20px` radius).
- **Primary**: Bold accent background, text-primary, font-semibold, micro-tracking.
- **Hover**: Shift background color to hover accent, scale outline focus.

### Inputs / Fields
- **Shape**: Rounded full pill.
- **Style**: Dark surface, thin borders, placeholder text-muted.
- **Focus**: Transitions border to active periwinkle/mint with a soft glow ring.

### Cards / Containers
- **Corner Style**: Rounded default (`20px`).
- **Surface**: Card Obsidian background with thin `border` (`oklch(0.28 0.01 260 / 0.7)`).
- **Interaction**: Transition border strength and elevate shadow on mouse hover.

## Do's and Don'ts

### Do:
- **Do** map layout wrapper states to contextual themes (`.theme-tasks`, `.theme-expenses`) to dynamically sync the active accent colors.
- **Do** utilize `prefers-reduced-motion` media overrides to compress animation durations to `0.01ms` for keyboard and accessibility users.
- **Do** format numbers, prices, and timestamps in tabular monospace styles to guarantee clean alignment in ledgers.

### Don't:
- **Don't** use pure solid blacks (`#000000`) for visual ground; always stick to deep Obsidian `oklch(0.12 0.01 260)`.
- **Don't** add text gradients or flashy multi-color glows.
- **Don't** overlay low-contrast text on bright backgrounds; maintain a minimum `4.5:1` contrast ratio.
