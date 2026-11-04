# Tasks

A project holds tasks. Each task has a title, an open/done state and an optional due date. This module stores them and serves the routes that add, edit and toggle them; the task list itself is rendered on the project's page (`src/projects/routes.ts`).

## Data (`tasks` table, `schema/schema.sql`)

- `id`, `project_id` (cascade-deleted with its project), `title`, `done` (default false), `due_date` (nullable `date`, no time of day), `created_by`, `created_at`.
- Tasks added before due dates existed have `due_date` NULL.

## `tasks.ts`

- `Task`: `{ id, project_id, title, done, due_date }`, `due_date` being `"YYYY-MM-DD"` or `null`. It is read with `to_char(due_date, 'YYYY-MM-DD')`, so the driver never turns it into a JS `Date` and no time zone gets involved.
- `listTasks(db, projectId)`: a project's tasks ordered by `due_date ASC NULLS LAST, id`: earliest due date first, undated tasks last, ties in the order added. Done tasks sort the same way as open ones.
- `getTask(db, id)`: one task, or `undefined`.
- `addTask(db, projectId, title, due, userId)`, `updateTask(db, id, title, due)` (returns the project id, or `undefined` when there's no such task), `toggleTask(db, id)` (flips done, returns the project id or `undefined`).
- `MAX_TITLE` (200) and `validTitle(title)`: a title is 1 to 200 characters after trimming.
- `parseDue(value)`: `""` → `null` (no due date); a real calendar date in exactly `YYYY-MM-DD` (year 0001 or later, month 1–12, day within the month, leap years honoured) → that string; anything else → `undefined` (invalid). Past dates are allowed.
- `todayUtc(now?)`: today's date in UTC as `YYYY-MM-DD`.
- `isOverdue(task, today)`: true only when the task is open and its due date is earlier than `today`. A task due today isn't overdue; a done task never is.

## Routes (`routes.ts`)

All `/tasks/*` routes need a signed-in user (`requireUser`); `/projects/:id/tasks` is covered by the projects module's guard.

- `POST /projects/:id/tasks` with `title` and `due`: 404 for a missing project. An invalid `due` answers 400 with the project's page showing "Give the due date as a real date, or leave it empty." and adds nothing. Otherwise a valid title adds the task; an empty or over-long title silently adds nothing. Either way it redirects to the project.
- `GET /tasks/:id/edit`: the "Edit task" page: "Title" and "Due date" (`type="date"`, sent as `due`) filled with the task's values, a "Save" button and a "Back to the project" link. 404 for a missing task.
- `POST /tasks/:id/edit` with `title` and `due`: 404 for a missing task. A bad title answers 400 with "Give the task a title of 1 to 200 characters."; a bad due date answers 400 with the due date error; both re-show the "Edit task" page with what was entered and leave the task unchanged. An empty `due` clears the due date. On success it redirects to the task's project.
- `POST /tasks/:id/toggle`: flips done and redirects to the project; 404 for a missing task.

## Invariants

- "Today" for the overdue check is the server's current date in UTC.
- A due date is only ever stored after `parseDue` accepts it.
