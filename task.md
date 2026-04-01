# Implementation Checklist: TaskOS Gamified Overhaul

- `[/]` **1. Database & Type Models**
  - `[ ]` Update `src/types/index.ts` with `UserStats`, `Note`, and new `Task` features (`taskCategory`, `lastCompletedAt`).
  - `[ ]` Update `firestore.rules` for `notes` and `user_stats` collections.

- `[ ]` **2. Core Application Logic (`App.tsx`)**
  - `[ ]` Add state and `onSnapshot` listeners for `notes` and `user_stats`.
  - `[ ]` Implement `awardEXP(amount)` function handling level ups and streak maintenance.
  - `[ ]` Implement standard midnight reset check for "daily" tasks.

- `[ ]` **3. Task Modal Updates (`TaskModal.tsx`)**
  - `[ ]` Add a selector to classify tasks as `Standard`, `Daily Protocol`, or `Strategic Directive (Long Term)`.

- `[ ]` **4. Task Tracker UI Reform (`Tasks.tsx`)**
  - `[ ]` Divide layout into a responsive dashboard grid.
  - `[ ]` Build "Daily Protocols" checklist component (Left Pane).
  - `[ ]` Build "Persistent Memory" notes section (Left Pane bottom).
  - `[ ]` Implement Tabbed view for Standard Kanban vs Long-Term Roadmaps (Right Pane).

- `[ ]` **5. Dashboard Gamification (`Dashboard.tsx`)**
  - `[ ]` Build "Operator Status" module showing Level, EXP Progress Bar, and Streak Flame.
  - `[ ]` Add "Daily Protocol Widget" for quick, dashboard-based completion.

- `[ ]` **6. Polish & Verification**
  - `[ ]` Verify animations, typography, and neo-minimalist theme coherence.
  - `[ ]` Test Firebase connections and UX flow.
