# Design: Shopping Category + Within-Category Task Reordering

**Date:** 2026-05-14

---

## 1. Rename Finance → Shopping

### What changes
- In the `CATEGORIES` array (`index.html`), update the entry with id `finance`:
  - `label`: `"Finance"` → `"Shopping"`
  - `emoji`: `"💰"` → `"🛒"`
- The `id` stays `"finance"` — no data migration needed; existing tasks keep working.

### AI categorisation (worker.js)
- Update the system prompt's category list description so Claude understands `finance` = shopping/buying tasks.
- Add a note: "finance = shopping and buying things — anything involving purchasing, orders, errands to buy something"

### Local fallback categorisation (index.html ~line 1038)
- The keyword-matching block that assigns `category = 'finance'` currently fires on financial keywords.
- Replace/extend the pattern to match buying-related keywords: buy, purchase, order, shop, get (in shopping context), pick up, groceries, etc.

---

## 2. Drag-to-Reorder Within a Category

### Database
- Add a `sort_order INTEGER` column to the Supabase `tasks` table (nullable, default null).
- No backfill needed — null means "use automatic sort" (existing behaviour preserved).

### Sort logic
Update `sortTasks(arr)` to:
1. Split tasks into two groups: those with `sort_order != null` and those without.
2. Manual-ordered tasks sort by `sort_order` ascending, displayed first.
3. Unordered tasks use the existing logic (overdue → due date → priority → created_at), displayed after.

### Drag interaction
The existing drag system handles cross-category moves. Extend it to handle within-category reordering:

- **Drag start**: record `draggedId` (unchanged).
- **Drag over task item** (not just the category section): show a horizontal insertion line above or below the hovered task item to indicate drop position.
- **Drop on task item**: if the dragged task and target task share the same category, reorder within category. Renumber all tasks in that category `1, 2, 3…` based on new position, then batch-update `sort_order` in Supabase.
- **Drop on category section** (existing): if different category, move task to that category as before. Dropped task gets `sort_order = null` (reverts to auto-sort position in the new category).

### Visual feedback
- Add a `.drop-indicator` CSS rule: a 2px accent-coloured line that appears between task items during an intra-category drag.
- The existing `.dragging` opacity-fade and `.drop-target` category outline remain for cross-category drags.

### New tasks
- Newly added tasks get `sort_order = null` by default (appear at bottom of auto-sorted group).
- Once a user manually reorders any task in a category, all tasks in that category receive explicit sort_order values.

---

## Error handling
- If the Supabase batch update fails, revert the in-memory order and re-render (same pattern as existing update failures).

## Out of scope
- Reordering in the urgent strip (top section) — that strip always sorts by urgency/due date.
- Reordering across categories via drag — that moves the task, not its relative position.
