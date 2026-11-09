# Tasks module (`src/tasks/`)

## Purpose

Stores a project's tasks and serves the routes that add them, mark them done or open again, and edit their due date. The project page that lists tasks lives in `src/projects/`; this module supplies the data it shows.

## Data

`tasks` table (see `schema/schema.sql`): `id`, `project_id` (cascade-deleted with the project), `title`, `done`, `due_date` (nullable `date`, no default), `created_by`, `created_at`.

`Task` (in `tasks.ts`) as every query returns it:

- `id`, `project_id`, `title`, `done`
- `due_date`: `"YYYY-MM-DD"` or `null`. Formatted in SQL with `to_char`, so it never passes through a JavaScript `Date` or a time zone.
- `overdue`: computed in SQL as open (`NOT done`) and `due_date` before today's **UTC** date (`(now() AT TIME ZONE 'UTC')::date`). A task due today is not overdue; an undated or done task never is.

## Functions (`tasks.ts`)

- `listTasks(db, projectId)`: a project's tasks ordered `due_date ASC NULLS LAST, id`: earliest due first, undated last, ties (same date, or both undated) in the order added. Done and open tasks sort the same way.
- `getTask(db, id)`: one task, or `undefined`.
- `addTask(db, projectId, title, userId, dueDate = null)`.
- `setDueDate(db, id, dueDate | null)`: sets or clears the due date; returns the task's project id, or `undefined` if no such task.
- `toggleTask(db, id)`: flips `done`; returns the project id, or `undefined`.
- `parseDueDate(value)`: reads a submitted "Due date" field. Empty or missing → `null` (no due date); a real `YYYY-MM-DD` calendar date → that string; anything else (wrong shape, or a date like 2030-02-30) → `undefined`, meaning invalid.

## Routes (`routes.ts`)

Everything under `/tasks/*` needs a signed-in user (`requireUser` redirects to `/login`).

- `POST /projects/:id/tasks`, fields `title`, `due_date`: adds the task when the title is 1–200 characters and the due date is empty or valid; otherwise adds nothing. Always redirects to the project page. 404 for an unknown project.
- `POST /tasks/:id/toggle`: flips done, redirects to the project. 404 for an unknown task.
- `GET /tasks/:id/edit`: the "Edit task" page. Shows the title (not editable), a "Due date" `<input type="date">` holding the current due date or empty, a "Save" button, and a link "Back to <project name>" to the project page. 404 for an unknown task.
- `POST /tasks/:id/edit`, field `due_date`: an empty value clears the due date, a valid date sets it, an invalid one changes nothing. Redirects to the project page. 404 for an unknown task.

## Invariants

- Only the due date is editable after a task is added; titles can't be edited and tasks can't be deleted.
- Tasks added before due dates existed have `due_date` null and behave like any undated task.
- "Today" is always the UTC date, the time zone QA and prod run in.

## Tests

`tests/integration/app.test.ts` ("projects and tasks", "due dates") covers these routes on PGlite; `tests/feature/due-dates.spec.ts` covers the user-visible behaviour.
