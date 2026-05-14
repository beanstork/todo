# Shopping Category + Within-Category Task Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the Finance category to Shopping, update all AI/fallback routing to send buying-related tasks there, and add persistent drag-to-reorder within categories backed by a Supabase `sort_order` column.

**Architecture:** All logic lives in two files — `index.html` (CSS + JS) and `worker.js` (Cloudflare Worker for AI task parsing). A new `sort_order INTEGER` column is added to the Supabase `tasks` table. Within-category drag is handled by new `dragOverTask`/`dropOnTask` functions that intercept events before they bubble to the existing category-level handlers. On reorder, all tasks in the category are assigned sequential `sort_order` values (1, 2, 3…) and batch-updated in Supabase.

**Tech Stack:** Vanilla JS, HTML/CSS, Supabase JS v2, Cloudflare Worker, Claude API

---

## Task 1: Add `sort_order` column to Supabase

**Files:**
- No code files — this is a database change via the Supabase dashboard

- [ ] **Step 1: Open the Supabase SQL editor**

Go to your Supabase project dashboard → SQL Editor → New query.

- [ ] **Step 2: Run the migration**

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER;
```

- [ ] **Step 3: Verify the column exists**

Run this query and confirm `sort_order` appears in the results:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'sort_order';
```

Expected output: one row showing `sort_order | integer`.

---

## Task 2: Rename Finance → Shopping in the categories list

**Files:**
- Modify: `index.html` line 341

- [ ] **Step 1: Update the CATEGORIES entry**

Find this line (around line 341):
```javascript
    { id: 'finance',   label: 'Finance',           emoji: '💰' },
```
Replace with:
```javascript
    { id: 'finance',   label: 'Shopping',          emoji: '🛒' },
```

The `id` stays `'finance'` — existing tasks in the database keep working with no migration.

- [ ] **Step 2: Update the emoji fallback in the local parser**

Find this block (around line 1074):
```javascript
      const catEmoji = { personal:'🌸', finance:'💰', admin:'🏠', projects:'🚀', mishmish:'🐱', social:'🎉' };
```
Replace with:
```javascript
      const catEmoji = { personal:'🌸', finance:'🛒', admin:'🏠', projects:'🚀', mishmish:'🐱', social:'🎉' };
```

- [ ] **Step 3: Verify in browser**

Open `index.html` locally. The category that previously said "Finance 💰" should now show "Shopping 🛒".

- [ ] **Step 4: Commit**

```
git add index.html
git commit -m "rename Finance category to Shopping with trolley emoji"
```

---

## Task 3: Update local fallback task categorisation

**Files:**
- Modify: `index.html` lines 1037–1045

- [ ] **Step 1: Replace the finance keyword pattern**

Find this block (around lines 1037–1045):
```javascript
    } else if (/\b(pay|bill|invoice|bank|money|budget|tax|insurance|rent|salary|paycheck|credit card|loan|expense|receipt|transfer|pension|accountant|savings|mortgage|refund|subscription)\b/i.test(l)) {
      category = 'finance';
    } else if (/\b(doctor|dentist|appointment|gp|hospital|renew|renewal|license|passport|permit|electricity|gas|water|broadband|council|nhs|visa|driving|mot|plumber|electrician|landlord|estate agent|letting|utility|utilities|insurance claim|form|application|register)\b/i.test(l)) {
      category = 'admin';
```
Replace with:
```javascript
    } else if (/\b(buy|buying|bought|purchase|order|orders|shop|shopping|groceries|grocery|supermarket|pick up|pickup|get from|collect from|amazon|delivery|deliveries|online order|cart|checkout)\b/i.test(l)) {
      category = 'finance';
    } else if (/\b(pay|bill|invoice|bank|money|budget|tax|insurance|rent|salary|paycheck|credit card|loan|expense|receipt|transfer|pension|accountant|savings|mortgage|refund|subscription|doctor|dentist|appointment|gp|hospital|renew|renewal|license|passport|permit|electricity|gas|water|broadband|council|nhs|visa|driving|mot|plumber|electrician|landlord|estate agent|letting|utility|utilities|insurance claim|form|application|register)\b/i.test(l)) {
      category = 'admin';
```

Note: financial admin keywords (pay, bill, bank, etc.) are merged into the `admin` pattern since they no longer belong in Shopping.

- [ ] **Step 2: Test in browser**

Open `index.html`. Type a task like `"buy milk"` or `"order from amazon"` and submit. Verify the task lands in the Shopping category. Then type `"pay electricity bill"` and verify it lands in Life admin.

- [ ] **Step 3: Commit**

```
git add index.html
git commit -m "update local fallback categorisation: finance id now routes shopping/buying tasks"
```

---

## Task 4: Update the AI worker categorisation

**Files:**
- Modify: `worker.js` lines 22–41

- [ ] **Step 1: Update the system prompt**

Find the `systemPrompt` in `worker.js`. Replace the entire template literal content with the updated version below (the category list description and the rules section both need updating):

```javascript
      const systemPrompt = `You are a task parser. Given natural language input, return ONLY valid JSON — no markdown, no explanation.

Categories: personal, finance, admin, projects, mishmish, social
Priority: urgent, high, normal
Today: ${today}

Return exactly:
{
  "text": "clean task description",
  "category": "personal|finance|admin|projects|mishmish|social",
  "priority": "urgent|high|normal",
  "emoji": "single relevant emoji or null",
  "due": "YYYY-MM-DD or null",
  "notes": "extra context or null"
}

Rules:
- finance = shopping and buying things — anything involving purchasing, ordering, picking up, or buying something goes here
- admin = life administration: bills, payments, appointments, renewals, utilities, forms, financial admin
- mishmish is the user's cat — anything about Mishmish goes in mishmish category
- urgent = needs doing today or ASAP
- high = deadline within a week
- Resolve relative dates (next Tuesday, end of month, in 3 days) to absolute YYYY-MM-DD based on today
- Pick a relevant emoji that adds meaning, or null if nothing fits`;
```

- [ ] **Step 2: Deploy the worker**

Deploy via Wrangler CLI:
```
wrangler deploy
```
Or via the Cloudflare dashboard: paste the updated `worker.js` content and click Deploy.

- [ ] **Step 3: Test AI parsing**

In the live app, use the voice/AI input to add a task like `"buy new headphones"`. Verify it is categorised as Shopping. Then add `"pay council tax"` and verify it goes to Life admin.

- [ ] **Step 4: Commit**

```
git add worker.js
git commit -m "update AI worker: finance category now handles shopping/buying tasks"
```

---

## Task 5: Update `sortTasks` to respect `sort_order`

**Files:**
- Modify: `index.html` lines 487–504

- [ ] **Step 1: Replace the `sortTasks` function**

Find the `sortTasks` function (around line 487) and replace it entirely:

```javascript
  function sortTasks(arr) {
    const manual = arr.filter(t => t.sort_order != null).sort((a, b) => a.sort_order - b.sort_order);
    const auto = arr.filter(t => t.sort_order == null).sort((a, b) => {
      const da = getDaysUntil(a.due);
      const db2 = getDaysUntil(b.due);
      const aOver = da !== null && da < 0;
      const bOver = db2 !== null && db2 < 0;
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      if (aOver && bOver) return da - db2;
      if (da !== null && db2 !== null) return da - db2;
      if (da !== null) return -1;
      if (db2 !== null) return 1;
      const po = { urgent: 0, high: 1, normal: 2 };
      const pd = (po[a.priority] || 2) - (po[b.priority] || 2);
      if (pd !== 0) return pd;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    return [...manual, ...auto];
  }
```

Manually-ordered tasks (those with a `sort_order`) appear first in their assigned order. Unordered tasks follow using the existing automatic sort.

- [ ] **Step 2: Verify existing tasks still sort correctly**

Open `index.html` in the browser. Tasks that haven't been dragged yet (all existing tasks have `sort_order = null`) should display exactly as before. No visual change expected at this step.

- [ ] **Step 3: Commit**

```
git add index.html
git commit -m "update sortTasks to put manually-ordered tasks first by sort_order"
```

---

## Task 6: Add drop-indicator CSS

**Files:**
- Modify: `index.html` around line 170 (after existing drag/drop CSS)

- [ ] **Step 1: Add the CSS**

Find this block (around line 167–170):
```css
    /* Drag and drop */
    .task-item[draggable="true"] { cursor: grab; }
    .task-item.dragging { opacity: 0.3; box-shadow: none; }
    .category-section.drop-target { outline: 2px dashed var(--accent); outline-offset: 4px; border-radius: var(--radius); }
```
Replace with:
```css
    /* Drag and drop */
    .task-item[draggable="true"] { cursor: grab; }
    .task-item.dragging { opacity: 0.3; box-shadow: none; }
    .category-section.drop-target { outline: 2px dashed var(--accent); outline-offset: 4px; border-radius: var(--radius); }
    .task-item.drop-above { border-top: 2px solid var(--accent); }
    .task-item.drop-below { border-bottom: 2px solid var(--accent); }
```

- [ ] **Step 2: Commit**

```
git add index.html
git commit -m "add drop-above/drop-below CSS for within-category drag indicator"
```

---

## Task 7: Add `reorderTasksInDb` and wire drag handlers

**Files:**
- Modify: `index.html` lines 414–426 (after `updateTaskInDb`), lines 844–873 (drag functions), line 590 (renderTaskItem)

- [ ] **Step 1: Add `reorderTasksInDb` after the existing `updateTaskInDb` function**

After the closing brace of `updateTaskInDb` (around line 426), add:

```javascript
  async function reorderTasksInDb(updates) {
    setSyncStatus('syncing');
    try {
      await Promise.all(updates.map(({ id, sort_order }) =>
        db.from('tasks').update({ sort_order }).eq('id', id)
      ));
      setSyncStatus('synced');
      return true;
    } catch (e) {
      setSyncStatus('error');
      setStatus('Reorder failed — check connection');
      return false;
    }
  }
```

- [ ] **Step 2: Add `dragOverTask`, `dragLeaveTask`, and `dropOnTask` functions**

Find the drag-and-drop section (around line 844). After the existing `drop` function (around line 873), add these three new functions:

```javascript
function clearDropIndicators() {
  document.querySelectorAll('.task-item.drop-above, .task-item.drop-below').forEach(el => {
    el.classList.remove('drop-above', 'drop-below');
  });
}

function dragOverTask(event, targetId) {
  if (!draggedId || draggedId === targetId) return;
  const dragged = tasks.find(t => t.id === draggedId);
  const target = tasks.find(t => t.id === targetId);
  if (!dragged || !target || dragged.category !== target.category) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = 'move';
  const rect = event.currentTarget.getBoundingClientRect();
  const insertBefore = (event.clientY - rect.top) < rect.height / 2;
  clearDropIndicators();
  event.currentTarget.classList.add(insertBefore ? 'drop-above' : 'drop-below');
}

function dragLeaveTask(event, targetId) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove('drop-above', 'drop-below');
  }
}

async function dropOnTask(event, targetId) {
  clearDropIndicators();
  if (!draggedId || draggedId === targetId) { draggedId = null; return; }
  const dragged = tasks.find(t => t.id === draggedId);
  const target = tasks.find(t => t.id === targetId);
  if (!dragged || !target || dragged.category !== target.category) return;
  event.preventDefault();
  event.stopPropagation();

  const rect = event.currentTarget.getBoundingClientRect();
  const insertBefore = (event.clientY - rect.top) < rect.height / 2;

  const catTasks = sortTasks(tasks.filter(t => t.category === dragged.category));
  const withoutDragged = catTasks.filter(t => t.id !== draggedId);
  const targetIdx = withoutDragged.findIndex(t => t.id === targetId);
  const insertIdx = insertBefore ? targetIdx : targetIdx + 1;
  withoutDragged.splice(insertIdx, 0, dragged);

  const updates = withoutDragged.map((t, i) => ({ id: t.id, sort_order: i + 1 }));
  updates.forEach(u => {
    const t = tasks.find(t => t.id === u.id);
    if (t) t.sort_order = u.sort_order;
  });
  render();

  const ok = await reorderTasksInDb(updates);
  if (!ok) await loadTasks();
  draggedId = null;
}
```

- [ ] **Step 3: Update `renderTaskItem` to add the new drag handlers**

Find the `renderTaskItem` function (around line 585). Replace the opening `<div>` of the returned HTML:

Old:
```javascript
    return `<div class="task-item ${priorityCls}" id="ti-${id}" draggable="true"
      ondragstart="dragStart(event,'${id}')" ondragend="dragEnd(event,'${id}')">
```
New:
```javascript
    return `<div class="task-item ${priorityCls}" id="ti-${id}" draggable="true"
      ondragstart="dragStart(event,'${id}')" ondragend="dragEnd(event,'${id}')"
      ondragover="dragOverTask(event,'${id}')" ondragleave="dragLeaveTask(event,'${id}')" ondrop="dropOnTask(event,'${id}')">
```

- [ ] **Step 4: Update existing `dragEnd` to clear drop indicators**

Find the `dragEnd` function (around line 850):
```javascript
function dragEnd(event, id) {
  document.getElementById('ti-' + id)?.classList.remove('dragging');
  draggedId = null;
}
```
Replace with:
```javascript
function dragEnd(event, id) {
  document.getElementById('ti-' + id)?.classList.remove('dragging');
  clearDropIndicators();
  draggedId = null;
}
```

- [ ] **Step 5: Update existing `drop` (category-level) to also clear indicators**

Find the `drop` function (around line 864). Add `clearDropIndicators();` as the second line:
```javascript
async function drop(event, catId) {
  event.preventDefault();
  clearDropIndicators();
  document.getElementById('cs-' + catId)?.classList.remove('drop-target');
  if (!draggedId) return;
  const task = tasks.find(t => t.id === draggedId);
  if (!task || task.category === catId) { draggedId = null; return; }
  const ok = await updateTaskInDb(draggedId, { category: catId, sort_order: null });
  if (ok) { task.category = catId; task.sort_order = null; render(); }
  draggedId = null;
}
```

Note: `sort_order: null` is added to the update so that a task moved to a new category reverts to auto-sort position in that category.

- [ ] **Step 6: Test drag-to-reorder in browser**

Open `index.html`. In a category with multiple tasks:
1. Drag a task — you should see it go semi-transparent.
2. Hover over another task in the same category — an accent-coloured line should appear above or below depending on mouse position.
3. Drop — the task should move to the new position immediately.
4. Reload the page — the order should persist (tasks have sort_order values stored in Supabase).

Also verify cross-category drag still works: drag a task and hover over a different category section — the dashed outline should appear and dropping should move the task.

- [ ] **Step 7: Commit**

```
git add index.html
git commit -m "add within-category drag-to-reorder with Supabase persistence"
```

---

## Task 8: Push to GitHub

- [ ] **Step 1: Push all commits**

```
git push
```

- [ ] **Step 2: Verify on live site**

Open the deployed app. Confirm:
- Shopping category shows 🛒 and "Shopping" label
- New buying-related tasks (via AI or voice) land in Shopping
- Drag-to-reorder works within categories and persists after reload
- Cross-category drag still works
