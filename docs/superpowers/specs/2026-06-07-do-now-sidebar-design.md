# Do Now Sidebar — Design Spec

**Date:** 2026-06-07
**Status:** Approved

## Overview

Add a persistent right sidebar panel called "Do Now" where the user can drag tasks from the main list to create a focused, real-time work queue. Tasks in the panel persist across page reloads (stored in Supabase). Checking off a task in the panel fully completes it (same as the main list checkbox). A ✕ button removes a task from the panel without completing it.

---

## Layout

The current app uses a single centered column (`max-width: 680px`). The new layout wraps the main content and the sidebar in a horizontal flex container:

```
┌─────────────────────────────┬──────────────────┐
│  Main task list (flex: 1)   │  Do Now sidebar  │
│  (existing content)         │  (260px fixed)   │
└─────────────────────────────┴──────────────────┘
```

- A new `.app-layout` wrapper div replaces the current `<main>` as the outer flex container.
- The existing `<main>` becomes the left column (retains its current styles but loses `max-width` / `margin: auto`).
- The sidebar is a new `<aside id="doNowPanel">` element, 260px wide, sticky to the viewport below the header + input bar.
- The header and input bar (which are outside `<main>`) remain unchanged and full-width.
- **Mobile (< 768px):** The sidebar stacks below the main list as a full-width section. When `doNowTasks.length === 0`, the sidebar is hidden entirely (`display: none`). When non-empty, it renders at full width above the normal bottom padding.

---

## Database Changes

Two new columns must be added to the `tasks` table in Supabase **before deploying the updated code**:

| Column | Type | Default | Nullable | Purpose |
|---|---|---|---|---|
| `do_now` | boolean | `false` | no | Whether this task is in the Do Now panel |
| `do_now_order` | integer | `null` | yes | Sort position within the panel (lower = higher) |

**Deployment order:** Add both columns via the Supabase dashboard first. Then deploy the code. If the code is deployed before the columns exist, `t.do_now` will be `undefined` for every task — the filter `tasks.filter(t => t.do_now)` will correctly return an empty array (since `undefined` is falsy), so the panel will show empty with no crash. This is acceptable graceful degradation.

The existing `loadTasks()` uses `select('*')`, so it picks up new columns automatically — no query changes needed.

---

## State

No new top-level state arrays. The panel derives its tasks by filtering the existing `tasks` array:

```js
const doNowTasks = tasks
  .filter(t => t.do_now)
  .sort((a, b) => (a.do_now_order ?? 0) - (b.do_now_order ?? 0));
```

---

## Rendering

A new `renderDoNow()` function populates `#doNowPanel`. It is called at the end of the existing `render()` function.

**Panel structure:**
- Header: "⚡ Do Now" label + task count badge
- Sub-label: "Drag tasks here to focus"
- Drop zone area (highlights on `dragover`)
- Task list: each item shows task text, a completion checkbox, and a ✕ remove button
- Empty state message when `doNowTasks.length === 0`

**Task item in panel:**
```
[ ☐ ] Task text here                          ✕
```
- Checkbox: calls existing `completeTask(id)` — fully completes and archives the task
- ✕ button: calls `removeFromDoNow(id)` — sets `do_now: false, do_now_order: null`, re-renders
- **Panel task items are not draggable.** They do not have `draggable="true"` and do not attach any drag event handlers. This avoids conflicts with the existing intra-list drag-and-drop system.

---

## Drag and Drop

The existing DnD system uses `draggedId` global + HTML5 events. The Do Now panel becomes an additional drop target, using the same `draggedId`. Only tasks from the main list (which are already `draggable="true"`) can be dragged into the panel.

**New event handlers on the panel drop zone:**
- `doNowDragOver(event)` — `preventDefault()`, add `.drop-target` class to panel
- `doNowDragLeave(event)` — remove `.drop-target` class
- `doNowDrop(event)` — remove `.drop-target` class; if `draggedId` is set and the task is not already `do_now`, call `addToDoNow(draggedId)`; if the task is already `do_now`, do nothing silently (this is intentional — re-dropping an already-queued task is a no-op)

**`addToDoNow(id)`:**
1. Compute next `do_now_order`:
   ```js
   const nextOrder = doNowTasks.length === 0
     ? 0
     : Math.max(...doNowTasks.map(t => t.do_now_order ?? 0)) + 1;
   ```
2. Call `updateTaskInDb(id, { do_now: true, do_now_order: nextOrder })`
3. Update the local task object in `tasks`, re-render

**`removeFromDoNow(id)`:**
1. Call `updateTaskInDb(id, { do_now: false, do_now_order: null })`
2. Update the local task object in `tasks`, re-render

No changes to existing drag handlers (`dragStart`, `dragEnd`, `dragOverTask`, `dropOnTask`, etc.) — they remain purely for intra-list reordering within the main list.

**Visual affordance:** Tasks in the main list already have `draggable="true"`. No change needed. The panel drop zone highlights via a `.drop-target` CSS class (dashed border in `--accent` color).

---

## Completion Flow

When the checkbox in the Do Now panel is clicked, it calls the existing `completeTask(id)` function unchanged. That function:
1. Sets `completed: true, completed_at: now` in the DB
2. Moves the task from `tasks` to `archived` in local state
3. Re-renders

Since the completed task is no longer in `tasks`, it automatically disappears from the Do Now panel on the next render. No special handling needed. The `do_now` and `do_now_order` columns are left as-is on the completed row — they have no effect on archived tasks.

---

## Styling

New CSS variables defined in both `:root` (light) and `@media (prefers-color-scheme: dark)`:

| Variable | Light value | Dark value | Purpose |
|---|---|---|---|
| `--do-now-bg` | `#F3F0EB` | `#201D1A` | Sidebar background |
| `--do-now-border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.06)` | Left divider line |

The `--accent` variable is reused for the drop zone highlight and panel header accent colour — no new accent variable needed.

Panel task items use the same base `.task-item` card style as the main list, with `font-size` reduced to 13px to fit the narrower column.

---

## Out of Scope

- Reordering tasks within the Do Now panel by dragging (tasks are ordered by when they were added)
- A task count limit on the panel
- Notifications or timers tied to Do Now tasks
- Dragging tasks out of the panel back to the main list
