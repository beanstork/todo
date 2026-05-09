# To-Do App — Design Spec
*Date: 2026-05-09*

## Overview

A personal AI-powered to-do list web app for a single user. Deployed as a static site on GitHub Pages (`beanstork.github.io/todo/`). Tasks persist in Supabase. Natural language input is parsed by Claude via a Cloudflare Worker proxy. Voice input uses the browser's Web Speech API.

---

## Architecture

Three components:

1. **GitHub Pages** — hosts a single `index.html`. No build step. Push to `main` branch → deploys automatically.
2. **Cloudflare Worker** — a proxy script that holds the Claude API key server-side. The browser POSTs natural language text to the Worker; the Worker calls Claude and returns structured JSON. The Claude API key is never exposed to the browser.
3. **Supabase** — existing project. Existing `tasks` table with columns: `id` (uuid), `text`, `category`, `priority`, `emoji`, `due` (date), `notes`, `completed` (boolean), `completed_at` (timestamptz), `created_at` (timestamptz). Row Level Security enabled with open anon policy. The browser reads/writes Supabase directly using the anon key.

Data flows:
- **Add task**: browser → Cloudflare Worker → Claude API → browser → Supabase
- **Read/update/delete**: browser → Supabase directly

---

## Visual Design

- **Style**: Warm minimal. Existing palette retained: warm off-white background (`#F7F5F0`), forest green accent (`#2D5016`), `DM Serif Display` for the logo, `DM Sans` for body text.
- **Dark mode**: existing `prefers-color-scheme: dark` CSS is kept and updated to match new components.
- **Max width**: 680px, centred. Full-width on mobile.
- **Responsive**: mobile-first. Touch-friendly tap targets (min 44px). Works on iOS Safari and Android Chrome (Samsung included).

---

## Categories

Six fixed categories, displayed as labelled sections with an emoji and a coloured pill:

| ID | Label | Emoji |
|----|-------|-------|
| `personal` | Personal life | 🌸 |
| `finance` | Finance | 💰 |
| `admin` | Life admin | 🏠 |
| `projects` | Personal projects | 🚀 |
| `mishmish` | Mishmish | 🐱 |
| `social` | Social | 🎉 |

---

## Views

The app has two top-level views switchable via a tab bar at the top of the page. The input card is visible and functional in both views.

- **List** (default)
- **Calendar**

### List View

**Urgent strip**: a pinned section at the top, styled with a red highlight, showing all tasks that are either marked `urgent` priority or have a `due` date in the past. Tasks appear here regardless of category. The strip is context-aware: when a category filter is active, it shows only urgent/overdue tasks from that category.

**Category filter**: a scrollable row of pill buttons — "All" plus one per category. Selecting a category pill highlights it clearly and hides all other category sections. The urgent strip respects the active filter. No filter label or explanatory text is needed; the highlighted pill is the signal.

**Category sections**: six sections, one per category, each showing all tasks in that category including urgent ones. Within each section, tasks sort by: overdue first → due soonest → high priority → normal priority → creation order.

**Stats row**: below the filter pills. Shows: "n active", "n overdue" (red), "n due soon" (amber). Always reflects the current filter.

### Calendar View

Monthly grid. Days with tasks due show a dot indicator. Clicking a day expands a panel below the grid showing the tasks due that day (task text, emoji, priority badge). Tasks without a due date do not appear in the calendar. Previous/next month navigation buttons.

---

## Task Input

**Input card** pinned below the header contains:
- A textarea for natural language input (placeholder: *"Add a task... e.g. 'call the vet about Mishmish booster next Tuesday'"*)
- A microphone button (🎤) for voice input
- An Add button (✦ Add)
- A small AI status line below (italic, faint) — shows "Claude is parsing..." while waiting, clears on success

**Text input**: press Enter (without Shift) or click Add to submit.

**Voice input**: press the mic button → browser requests microphone permission → status shows "Listening..." → speech is transcribed in real time and drops into the textarea → transcript can be reviewed/edited before submitting → auto-submits after a 2-second pause if no edits are made. Uses the Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`). Works on iOS Safari and Android Chrome.

**Claude parsing**: the textarea content is sent to the Cloudflare Worker which calls `claude-sonnet-4-20250514`. Claude returns JSON:
```json
{
  "text": "cleaned task description",
  "category": "personal | finance | admin | projects | mishmish | social",
  "priority": "urgent | high | normal",
  "emoji": "single emoji or null",
  "due": "YYYY-MM-DD or null",
  "notes": "extra context or null"
}
```
Relative dates ("next Tuesday", "end of month") are resolved to absolute dates. If Claude is unavailable, the task saves with the raw text, category `personal`, priority `normal`, and null for everything else — the user is never blocked.

---

## Task Item

Each task row shows:
- A circular checkbox button (left)
- Emoji + task text
- Priority badge if `urgent` or `high` (coloured pill)
- Due date label if set: "Due today", "Due tomorrow", "Due in Nd", "Overdue by Nd" — colour-coded (red = overdue, amber = due within 5 days)
- Notes in small italic text below the task text if present
- A ✕ delete button (shows on hover on desktop; always visible on mobile)

### Completing a Task

1. User clicks the checkbox
2. Text gets a line-through and fades to grey
3. Ripple rings expand outward from the checkbox
4. The task card slides right and fades out (~500ms total)
5. Task is updated in Supabase (`completed: true`, `completed_at: now`)
6. Task moves to the archive

### Editing a Task (Inline Expand)

Clicking the task text expands the card in place to reveal:
- Text input (pre-filled)
- Category dropdown
- Priority dropdown
- Due date picker
- Notes textarea
- Save and Cancel buttons

Clicking Save updates Supabase and collapses the editor. Clicking Cancel or clicking outside collapses without saving.

### Deleting a Task

Clicking ✕ shows an inline confirmation on the task row:
> *Delete?* **Yes** · Cancel

"Yes" deletes from Supabase and removes the row. "Cancel" dismisses.

---

## Archive

Completed tasks are hidden by default. A "Show completed (n)" toggle link at the bottom of the list reveals a compact archive section: greyed-out rows, strikethrough text, each with a ✕ to manually delete.

**Auto-purge**: on app load, any completed task with `completed_at` more than 30 days ago is deleted from Supabase.

---

## Sync Indicator

A small dot in the header:
- Grey: idle
- Amber pulsing: syncing with Supabase
- Green: last sync successful
- Red: error

---

## Offline / Error Handling

If Supabase is unreachable when loading, show an error state in place of the task list with a retry button. If a write fails (add/edit/delete/complete), show a brief inline error and keep the local state so nothing is lost visually. No offline queue — this is a personal app, not a PWA.

---

## Cloudflare Worker

A minimal Worker script that:
1. Accepts a POST request with `{ "text": "..." }` in the body
2. Forwards to `api.anthropic.com/v1/messages` with the Claude API key (stored as a Worker secret)
3. Returns the parsed JSON response to the browser

CORS headers are set to allow requests from `beanstork.github.io`. The Worker is deployed to Cloudflare's free tier.

---

## Out of Scope

- User authentication / multi-user
- Push notifications / reminders
- Drag-and-drop reordering
- Subtasks
- Tags beyond category/priority
- PWA / offline mode
