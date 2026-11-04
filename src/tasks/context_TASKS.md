# Tasks (`src/tasks/`)

A project holds tasks. Each task has a title, an open/done state and an optional due date. Everyone signed in sees and changes every task.

## Data (`tasks.ts`)

`Task`: `id`, `project_id`, `title`, `done`, `due_date` (`YYYY-MM-DD` string or `null`).

- `listTasks(db, projectId)`: a project's tasks ordered by `due_date` ascending with undated tasks last, then by `id` (the order added). Done tasks sort by the same rule.
- `getTask(db, id)`: one task, or `undefined`.
- `addTask(db, projectId, title, userId, dueDate = null)`.
- `updateTask(db, id, title, dueDate)`: sets both; `null` clears the date.
- `toggleTask(db, id)`: flips done/open, returning the project id, or `undefined` when there's no such task.
- `parseDueDate(value)`: `null` for empty, the string for a real calendar `YYYY-MM-DD` date (past dates allowed), `undefined` for anything else (e.g. `2026-02-30`).
- `todayUtc()` and `isOverdue(task, today)`: a task is overdue when it is not done and its due date is before today's UTC date. Due today is not overdue. Worked out on every render, never stored.

Invariant: queries return `due_date` through `to_char(due_date, 'YYYY-MM-DD')` (`COLUMNS`), because `pg` and PGlite turn a `date` into a local-midnight `Date` that can shift the day.

## Routes (`routes.ts`)

`/tasks/*` requires sign-in (`requireUser`).

- `POST /projects/:id/tasks`: fields `title` and `due_date`. Adds the task when the title is valid (trimmed, 1 to 200 characters) and the due date is empty or valid; otherwise adds nothing. Always redirects to the project page; 404 for an unknown project.
- `GET /tasks/:id/edit`: the "Edit task" page, with a "Title" text field, a "Due date" date field (empty when there's none), a "Save" button and a link back to the project. 404 ("404 Not Found") for an unknown task.
- `POST /tasks/:id/edit`: fields `title` and `due_date`, under the same rules as adding. Valid input updates both; any invalid field changes nothing. Redirects to the project page; 404 for an unknown task.
- `POST /tasks/:id/toggle`: marks done or reopens, then redirects to the project page.

The project page that lists tasks lives in `src/projects/routes.ts` (see `src/projects/context_PROJECTS.md`).

## Tests

`tests/unit/due-dates.test.ts` covers the date helpers. `tests/integration/app.test.ts` covers the routes on PGlite. `tests/feature/due-dates.spec.ts` covers the browser journeys.
