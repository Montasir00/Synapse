# Critique Snapshot: Synapse

Target: `src`
Date: 2026-08-30
Total Score: 27/40
Max Score: 40

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Real-time loading sync and toast messages are active, but missing unified loading views. |
| 2 | Match System / Real World | 3 | Good high-performance terminology ("Resource Auditor"), fits the target audience well. |
| 3 | User Control and Freedom | 3 | Proper modal dismissals and delete warning confirmations. |
| 4 | Consistency and Standards | 2 | Ad-hoc font sizes (9px/10px/11px) and radii (10px scrollbars) bypass DESIGN.md steps. |
| 5 | Error Prevention | 3 | Validation is present on form submits; could be improved with real-time blur validations. |
| 6 | Recognition Rather Than Recall | 3 | Mobile nav dock relies entirely on icon-only navigation with no labels. |
| 7 | Flexibility and Efficiency | 2 | Fast transition caching, but lacks keyboard accelerators for power users. |
| 8 | Aesthetic and Minimalist Design | 3 | Elegant Obsidian dark palette, but dense data layouts trigger slight cognitive strain. |
| 9 | Error Recovery | 3 | Firebase connectivity errors handled gracefully via toast overlays. |
| 10 | Help and Documentation | 2 | No inline onboarding tutorials or contextual documentation guides. |
| **Total** | | **27/40** | **Acceptable** |

## Design Specificity Verdict
**Authored.** Synapse has a highly distinctive, intentional aesthetic: a dark Obsidian console styled with sharp periwinkle, mint, and coral signals. It avoids generic SaaS blue templates.

* **Deterministic Scan Findings**:
  * Found **40+** instances of layout and font-size drift in `src/components/TradeTracker/index.tsx`, `src/components/Loans.tsx`, and `src/components/Tasks.tsx`.
  * Ad-hoc text sizes like `text-[9px]`, `text-[10px]`, and `text-[11px]` are hardcoded, bypassing the central `--text-xs` (12px) design system floor.
  * Border radii of `10px` are hardcoded in `index.css` for scrollbar thumbs, violating the registered radius scale.

## Overall Impression
Synapse is visually cohesive and feels premium, but suffers from detail drift (ad-hoc CSS sizing utilities) and lacks accelerators or onboarding aids to guide the user through its high-density modules.

## What's Working
- **Cohesive Obsidian Atmosphere:** The dark background, noise texture overlay, and glowing indicator accents create an immersive cockpit feel.
- **Tacit Transitions:** Framer Motion layouts provide fluid page transitions.

## Priority Issues

### [P1] Non-Standard Font-Sizes and Radii
* **Why it matters:** Hardcoded utility classes (`text-[9px]`, `radius: 10px`) bypass the system tokens, leading to design fragmentation and unreadable text sizes.
* **Fix:** Replace all sub-12px text sizes with the system standard `--text-xs` (12px) floor, and align border-radii with the design tokens.
* **Suggested command:** `typeset` and `layout`

### [P1] Icon-Only Mobile Navigation
* **Why it matters:** Removing nav text labels in mobile layout forces Jordan (First-Timer) to memorize icon purposes, increasing cognitive load.
* **Fix:** Add optional tooltip labels or visual subtitles for mobile docks.
* **Suggested command:** `clarify`

### [P2] Lack of Keyboard Accelerators
* **Why it matters:** Alex (Power User) needs to log metrics quickly without hunting and clicking buttons.
* **Fix:** Introduce keyboard shortcuts (e.g. `n` for new task, `e` for new expense).
* **Suggested command:** `delight`

### [P2] Missing Inline Help
* **Why it matters:** Technical terminology ("Resource Depletion," "Trade Lattice") is hard for new operators to parse on first login.
* **Fix:** Add a minimal quick-start info overlay or contextual icon helpers.
* **Suggested command:** `onboard`

## Persona Red Flags

- **Alex (Power User):** Logging a daily protocol or exercise requires mouse navigation and modal completion. High risk of task fatigue due to lack of shortcuts.
- **Jordan (First-Timer):** Mobile navigation is entirely icon-based. Jargon like "Biological Status" and "Trade Lattice" has no inline explanation.
- **Sam (Accessibility Reader):** Micro-text sizing (9px/10px) is highly unreadable and violates the WCAG text scaling guidelines.
