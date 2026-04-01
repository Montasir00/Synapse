# Goal Description

Transform TaskOS from a standard Kanban board into a high-performance, gamified productivity engine. The goal is to introduce distinct task categories (Dailies, Persistent Notes, Long-Term Plans) and implement a sleek, "engineered" gamification system on the Dashboard to incentivize daily engagement without resorting to cartoonish aesthetics.

## Inspiration & Paradigm Shift

To achieve this while maintaining the "Neo-Minimalist Dark" aesthetic, we will draw inspiration from top-tier tools:
1. **Linear / Cron**: For the "Strategic Directives" (Long-term plans) and overall typographic density. We want long-term goals to feel like high-level project epics with clean progress indicators.
2. **Habitica / Duolingo (Math only)**: We will borrow the underlying psychology of Streaks and XP, but translate the visual language from "RPG/Fantasy" to a futuristic "System Console" vibe.
    * *XP* = **Execution Points (EXP)**
    * *Level* = **Operator Tier**
    * *Tasks* = **Protocols**
3. **Apple Notes / Google Keep**: For the "Persistent Memory" (Notes/Reminders). These need to be instantly accessible, visually distinct from tasks, and completely frictionless to edit.

## User Review Required

> [!IMPORTANT]
> **Data Migration**: To support these new features, we will need to add new data structures to Firebase. Old tasks will be automatically classified as "Standard", but you will see new collections being created in your backend.
> 
> **Dashboard Layout**: The gamification will become the focal point of the Dashboard. Are you okay with the Financial charts being pushed slightly down to make room for your "Operator Tier" and "EXP Progress Bar"?

## Proposed Changes

---

### 1. Database & Type Models
We need to update our core data definitions to support the new logic.

#### [MODIFY] `src/types/index.ts`
- **Task**: Add `taskCategory: 'daily' | 'long-term' | 'standard'`.
- **Task**: Add `lastCompletedData?: string` (to determine if a daily task resets at midnight).
- **UserStats [NEW]**: A new type to track gamification: `level`, `exp`, `currentStreak`, `lastActiveDate`.
- **Note [NEW]**: A new type for persistent reminders: `content`, `color`, `pinned`.

#### [MODIFY] `src/App.tsx`
- Implement new Firestore listeners for `notes` and `user_stats`.
- Add the core logic function: `awardEXP(amount)` which automatically checks if the user levels up and updates their stats in Firebase.

---

### 2. Dashboard Gamification
The Dashboard will be reformed to prioritize your daily progression.

#### [MODIFY] `src/components/Dashboard.tsx`
- **Operator Status Header**: Replace the standard greeting with a gamified hero section. It will display your current "Operator Tier", a glowing, animated EXP progress bar indicating how close you are to the next level, and a flame icon for your "Current Streak".
- **Daily Protocol Widget**: Add a dedicated quick-action card on the Dashboard that only shows today's "Daily Tasks". Completing them here instantly fires an animation and awards EXP.

---

### 3. Task Tracker Reform
The Tasks page will be overhauled from a simple Kanban board into a comprehensive control center.

#### [MODIFY] `src/components/Tasks.tsx`
- **Architectural Shift**: Move away from a full-page Kanban.
- **Left Sidebar / Pane**:
    - **Daily Protocols**: A checklist that resets every day.
    - **Persistent Memory**: A masonry-grid or simple list of sticky notes/reminders that stay constant until deleted.
- **Main Content Area**:
    - **Tab 1: Standard Execution**: The current Kanban board for day-to-day work.
    - **Tab 2: Strategic Directives**: A new view specifically designed for long-term plans. Instead of columns, these will be rendered as horizontal "Epics" with subtask completion bars.

#### [NEW] `src/components/NotesWidget.tsx`
- A dedicated, lightweight component to handle the inline editing and displaying of persistent notes/reminders.

## Open Questions

> [!WARNING]
> 1. **Daily Task Resetting**: How do you want Daily Tasks to behave? Should they simply un-check themselves at midnight, or do you want a history of which days you missed them?
> 2. **Gamification Rewards**: Aside from the visual progress bar and Level increasing, do you want any specific rewards for leveling up? (e.g., unlocking new accent colors for the UI).

## Verification Plan

### Automated/Manual Testing
1. **Local Node Testing**: Ensure creating a Note, a Daily, and a Long-Term task correctly routes to the right visual section.
2. **Midnight Reset Test**: Simulate a date change to verify that tasks marked `daily` un-check themselves and break/maintain your streak.
3. **EXP Mathematics**: Verify that checking off tasks correctly increments EXP, and that crossing the threshold (e.g., 100 EXP) correctly increments the Operator Tier and resets the bar.
