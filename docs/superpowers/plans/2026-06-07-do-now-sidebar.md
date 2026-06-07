# Do Now Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent "Do Now" right sidebar where tasks can be dragged from the main list into a focused work queue, saved to Supabase.

**Architecture:** All changes live in a single file (`index.html`). The layout gains an `.app-layout` flex wrapper that holds the existing `<main>` and a new `<aside id="doNowPanel">`. Two new columns (`do_now`, `do_now_order`) on the Supabase `tasks` table persist the panel state. The existing HTML5 drag system is extended with new drop handlers on the panel.

**Tech Stack:** Vanilla JS, HTML, CSS. Supabase JS client v2 (already loaded). No new dependencies.

---

## Files

- **Modify only:** `index.html`
  - CSS section (~line 10–283): new variables, layout styles, sidebar styles
  - HTML section (~line 314–333): wrap `<main>` in `.app-layout`, add `<aside>`
  - JS section (~line 530–540): wire `renderDoNow()` into `render()`
  - JS section (after `renderArchiveToggle` ~line 641): add `renderDoNow()`
  - JS section (after drag functions ~line 950): add `addToDoNow()`, `removeFromDoNow()`, `completeFromPanel()`, `doNowDragOver()`, `doNowDragLeave()`, `doNowDrop()`

---

## Task 1: Add DB columns in Supabase (manual step — do this first)

**Files:** None (Supabase dashboard action)

- [ ] **Step 1: Open Supabase dashboard**

  Go to https://supabase.com → your project → Table Editor → `tasks` table → click the `+` column button.

- [ ] **Step 2: Add `do_now` column**

  - Name: `do_now`
  - Type: `bool`
  - Default value: `false`
  - Nullable: off

- [ ] **Step 3: Add `do_now_order` column**

  - Name: `do_now_order`
  - Type: `int4`
  - Default value: (leave empty)
  - Nullable: on

- [ ] **Step 4: Verify**

  Reload the app in the browser. Open DevTools → Network → find the Supabase `tasks` fetch response. Confirm each task object now has `"do_now": false` and `"do_now_order": null`.

---

## Task 2: Add CSS — variables, layout wrapper, sidebar

**Files:**
- Modify: `index.html` CSS block (inside `<style>`)

- [ ] **Step 1: Add CSS variables**

  In the `:root` block (after the last existing variable, before the closing `}`), add:

  ```css
      --do-now-bg: #F3F0EB;
      --do-now-border: rgba(0,0,0,0.08);
  ```

  In the `@media (prefers-color-scheme: dark)` `:root` override block, add:

  ```css
        --do-now-bg: #201D1A;
        --do-now-border: rgba(255,255,255,0.06);
  ```

- [ ] **Step 2: Replace `main` style and add layout wrapper**

  Find:
  ```css
      main { max-width: 680px; margin: 0 auto; padding: 1.25rem 1rem 4rem; }
  ```

  Replace with:
  ```css
      .app-layout { max-width: 980px; margin: 0 auto; display: flex; align-items: flex-start; gap: 0; }
      main { flex: 1; min-width: 0; padding: 1.25rem 1rem 4rem; }
  ```

- [ ] **Step 3: Add sidebar styles**

  Paste this block immediately after the `main` rule you just added:

  ```css
      /* Do Now sidebar */
      #doNowPanel {
        width: 260px; flex-shrink: 0;
        background: var(--do-now-bg);
        border-left: 1px solid var(--do-now-border);
        min-height: calc(100vh - var(--header-h) - 57px);
        padding: 1.25rem 0.875rem 2rem;
        position: sticky;
        top: calc(var(--header-h) + 57px);
        align-self: flex-start;
      }
      .do-now-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
      .do-now-title { font-size: 14px; font-weight: 600; color: var(--text); }
      .do-now-count { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--accent-light); color: var(--accent); font-weight: 500; margin-left: auto; }
      .do-now-hint { font-size: 11px; color: var(--text-faint); margin-bottom: 0.875rem; }
      .do-now-drop-zone {
        border: 2px dashed var(--border-strong); border-radius: var(--radius-sm);
        padding: 8px; min-height: 40px; margin-bottom: 0.75rem;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; color: var(--text-faint); transition: border-color 0.15s, background 0.15s;
      }
      .do-now-drop-zone.drop-target { border-color: var(--accent); background: var(--accent-light); color: var(--accent); }
      .do-now-task {
        display: flex; align-items: flex-start; gap: 8px; padding: 9px 10px;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
        margin-bottom: 6px;
      }
      .do-now-task .task-check { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
      .do-now-task-text { font-size: 13px; line-height: 1.45; color: var(--text); flex: 1; min-width: 0; word-break: break-word; }
      .do-now-remove { background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 13px; padding: 1px 3px; line-height: 1; flex-shrink: 0; opacity: 0; transition: opacity 0.15s, color 0.15s; }
      .do-now-task:hover .do-now-remove { opacity: 1; }
      .do-now-task:hover .do-now-remove:hover { color: var(--urgent); }
      .do-now-empty { font-size: 12px; color: var(--text-faint); font-style: italic; text-align: center; padding: 1rem 0.5rem; }
  ```

- [ ] **Step 4: Add mobile override**

  Inside the existing `@media (max-width: 480px)` block, add at the end (before the closing `}`):

  ```css
        #doNowPanel { display: none; }
  ```

  > On mobile the sidebar is hidden entirely. Tasks with `do_now: true` remain in the DB — they'll reappear when the user opens the app on a wider screen.

- [ ] **Step 5: Verify no visual regressions**

  Open the app in the browser. The layout should look identical to before — the sidebar doesn't exist in HTML yet so nothing should change visually.

- [ ] **Step 6: Commit**

  ```
  git add index.html
  git commit -m "style: add Do Now sidebar CSS and layout variables"
  ```

---

## Task 3: Add HTML structure — layout wrapper and sidebar aside

**Files:**
- Modify: `index.html` HTML body section (~line 314–333)

- [ ] **Step 1: Wrap `<main>` in `.app-layout` and add `<aside>`**

  Find this exact block:
  ```html
  <main>
    <div id="listView">
      <div class="filter-row" id="filterRow"></div>
      <div class="stats-row" id="statsRow"></div>
      <div id="urgentStrip"></div>
      <div id="taskList"></div>
      <button type="button" class="archive-toggle" id="archiveToggle" onclick="toggleArchive()"></button>
      <div class="archive-section" id="archiveSection" style="display:none"></div>
    </div>

    <div id="calendarView" style="display:none">
      <div id="calendarGrid"></div>
      <div id="calendarDayPanel"></div>
    </div>

    <div id="errorState" style="display:none" class="error-state">
      <p>Couldn't connect to Supabase.</p>
      <button type="button" onclick="loadTasks()">Retry</button>
    </div>
  </main>
  ```

  Replace with:
  ```html
  <div class="app-layout">
  <main>
    <div id="listView">
      <div class="filter-row" id="filterRow"></div>
      <div class="stats-row" id="statsRow"></div>
      <div id="urgentStrip"></div>
      <div id="taskList"></div>
      <button type="button" class="archive-toggle" id="archiveToggle" onclick="toggleArchive()"></button>
      <div class="archive-section" id="archiveSection" style="display:none"></div>
    </div>

    <div id="calendarView" style="display:none">
      <div id="calendarGrid"></div>
      <div id="calendarDayPanel"></div>
    </div>

    <div id="errorState" style="display:none" class="error-state">
      <p>Couldn't connect to Supabase.</p>
      <button type="button" onclick="loadTasks()">Retry</button>
    </div>
  </main>

  <aside id="doNowPanel"></aside>
  </div>
  ```

- [ ] **Step 2: Verify layout in browser**

  The app should still look the same as before — the `<aside>` is empty so it takes up no visible space. Open DevTools → Elements → confirm `.app-layout` wraps `<main>` and `<aside id="doNowPanel">`.

- [ ] **Step 3: Commit**

  ```
  git add index.html
  git commit -m "feat: add Do Now sidebar HTML structure"
  ```

---

## Task 4: Add `renderDoNow()` function and wire into `render()`

**Files:**
- Modify: `index.html` JS section

- [ ] **Step 1: Add `renderDoNow()` after `renderArchiveToggle()`**

  Find the line:
  ```js
  function toggleArchive() {
  ```

  Insert this entire block immediately before it:

  ```js
  function renderDoNow() {
    const panel = document.getElementById('doNowPanel');
    if (!panel) return;
    const doNowTasks = tasks
      .filter(t => t.do_now)
      .sort((a, b) => (a.do_now_order ?? 0) - (b.do_now_order ?? 0));

    const taskItems = doNowTasks.map(t =>
      `<div class="do-now-task" id="dn-${t.id}">
        <button class="task-check do-now-check" type="button" onclick="completeFromPanel('${t.id}')" aria-label="Mark complete"></button>
        <span class="do-now-task-text">${t.emoji ? esc(t.emoji) + ' ' : ''}${esc(t.text)}</span>
        <button class="do-now-remove" type="button" onclick="removeFromDoNow('${t.id}')" aria-label="Remove from Do Now" title="Remove from Do Now">✕</button>
      </div>`
    ).join('');

    panel.innerHTML = `
      <div class="do-now-header">
        <span style="font-size:16px">⚡</span>
        <span class="do-now-title">Do Now</span>
        ${doNowTasks.length ? `<span class="do-now-count">${doNowTasks.length}</span>` : ''}
      </div>
      <div class="do-now-hint">Drag tasks here to focus</div>
      <div class="do-now-drop-zone" id="doNowDropZone"
        ondragover="doNowDragOver(event)"
        ondragleave="doNowDragLeave(event)"
        ondrop="doNowDrop(event)">
        Drop here
      </div>
      ${taskItems}
      ${doNowTasks.length === 0 ? '<div class="do-now-empty">Nothing here yet</div>' : ''}
    `;
  }

  ```

- [ ] **Step 2: Wire `renderDoNow()` into `render()`**

  Find:
  ```js
  function render() {
    if (activeView === 'list') {
      renderFilterPills();
      renderStats();
      renderUrgentStrip();
      renderTaskList();
      renderArchiveToggle();
    } else {
      renderCalendar();
    }
  }
  ```

  Replace with:
  ```js
  function render() {
    if (activeView === 'list') {
      renderFilterPills();
      renderStats();
      renderUrgentStrip();
      renderTaskList();
      renderArchiveToggle();
      renderDoNow();
    } else {
      renderCalendar();
      renderDoNow();
    }
  }
  ```

- [ ] **Step 3: Verify sidebar renders in browser**

  Reload the app. The right sidebar should now appear with "⚡ Do Now", "Drag tasks here to focus", a drop zone, and "Nothing here yet". Open DevTools → confirm `#doNowPanel` has content.

- [ ] **Step 4: Commit**

  ```
  git add index.html
  git commit -m "feat: render Do Now sidebar panel"
  ```

---

## Task 5: Add `addToDoNow()`, `removeFromDoNow()`, and `completeFromPanel()`

**Files:**
- Modify: `index.html` JS section (add after the drag-and-drop functions block, around line 950)

- [ ] **Step 1: Add the three functions**

  Find the line:
  ```js
  // --- Drag and drop ---
  ```

  Insert this entire block immediately before it:

  ```js
  // --- Do Now panel actions ---
  async function addToDoNow(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || task.do_now) return;
    const doNowTasks = tasks.filter(t => t.do_now);
    const nextOrder = doNowTasks.length === 0
      ? 0
      : Math.max(...doNowTasks.map(t => t.do_now_order ?? 0)) + 1;
    const ok = await updateTaskInDb(id, { do_now: true, do_now_order: nextOrder });
    if (ok) {
      task.do_now = true;
      task.do_now_order = nextOrder;
      renderDoNow();
    }
  }

  async function removeFromDoNow(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const ok = await updateTaskInDb(id, { do_now: false, do_now_order: null });
    if (ok) {
      task.do_now = false;
      task.do_now_order = null;
      renderDoNow();
    }
  }

  async function completeFromPanel(id) {
    const item = document.getElementById('dn-' + id);
    if (item) {
      item.style.opacity = '0.4';
      item.style.pointerEvents = 'none';
    }
    const now = new Date().toISOString();
    await updateTaskInDb(id, { completed: true, completed_at: now, do_now: false, do_now_order: null });
    const t = tasks.find(t => t.id === id);
    if (t) { t.completed = true; t.completed_at = now; }
    tasks = tasks.filter(t => t.id !== id);
    if (t) archived.push(t);
    render();
  }

  ```

- [ ] **Step 2: Verify remove works**

  We'll test this after adding drag-and-drop (Task 6). Skip for now.

- [ ] **Step 3: Commit**

  ```
  git add index.html
  git commit -m "feat: add Do Now panel actions (add, remove, complete)"
  ```

---

## Task 6: Add drag-and-drop handlers for the panel

**Files:**
- Modify: `index.html` JS section (add after `completeFromPanel`, still in the Do Now block)

- [ ] **Step 1: Add drag handlers**

  Find:
  ```js
  // --- Drag and drop ---
  function dragStart(event, id) {
  ```

  Insert this block immediately before `// --- Drag and drop ---`:

  ```js
  function doNowDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    document.getElementById('doNowDropZone')?.classList.add('drop-target');
  }

  function doNowDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      document.getElementById('doNowDropZone')?.classList.remove('drop-target');
    }
  }

  function doNowDrop(event) {
    event.preventDefault();
    document.getElementById('doNowDropZone')?.classList.remove('drop-target');
    if (!draggedId) return;
    addToDoNow(draggedId);
    draggedId = null;
  }

  ```

- [ ] **Step 2: Verify drag-and-drop in browser (end-to-end test)**

  1. Reload the app.
  2. Drag any task from the main list and drop it onto the "Drop here" zone in the sidebar.
  3. **Expected:** Task appears in the sidebar below the drop zone. Badge count shows 1.
  4. Open DevTools → Network — confirm a PATCH/update request was sent to Supabase with `do_now: true`.
  5. Reload the page — task should still be in the sidebar (persisted).
  6. Click the ✕ on the sidebar task — task should disappear from sidebar and remain in main list.
  7. Drag the task back into the sidebar again.
  8. Click the checkbox on the sidebar task — task should fade out and disappear from both the sidebar and main list. Check "Show completed" to confirm it moved to archive.
  9. Try dragging an already-queued task back onto the drop zone — nothing should happen (silent no-op).

- [ ] **Step 3: Commit**

  ```
  git add index.html
  git commit -m "feat: add Do Now drag-and-drop handlers"
  ```

---

## Task 7: Final check and push

- [ ] **Step 1: Smoke test the full feature**

  - Add 3 tasks via the input bar.
  - Drag all 3 into Do Now — confirm they appear in order.
  - Switch to Calendar view — sidebar should still show (it renders on both views).
  - Switch back to List view.
  - Filter by a category — drag a task from the filtered list into Do Now — confirm it works.
  - Complete a task from the panel — confirm it leaves both the sidebar and main list.
  - Remove a task from the panel with ✕ — confirm it stays in the main list.
  - Resize browser window to < 480px — confirm sidebar is hidden.

- [ ] **Step 2: Push to GitHub**

  ```
  git push
  ```

  Vercel will auto-deploy. Wait ~30 seconds, then open the live URL and confirm the sidebar works.
