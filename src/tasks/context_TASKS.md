# Tasks module (`src/tasks/`)

## Purpose

Stores a project's tasks and their subtasks, and serves the routes that add them, mark them done or open again, and edit a task's due date. The project page that lists tasks lives in `src/projects/`; this module supplies the data it shows.

## Data

`tasks` table (see `schema/schema.sql`): `id`, `project_id` (cascade-deleted with the project), `title`, `done`, `due_date` (nullable `date`, no default), `created_by`, `created_at`.

`Task` (in `tasks.ts`) as every query returns it:

- `id`, `project_id`, `title`, `done`
- `due_date`: `"YYYY-MM-DD"` or `null`. Formatted in SQL with `to_char`, so it never passes through a JavaScript `Date` or a time zone.
- `overdue`: computed in SQL as open (`NOT done`) and `due_date` before today's **UTC** date (`(now() AT TIME ZONE 'UTC')::date`). A task due today is not overdue; an undated or done task never is.
- `days_overdue`: when `overdue`, the whole days from the due date to today's UTC date (at least 1), computed in SQL as `today - due_date`; otherwise `null`.

`subtasks` table: `id`, `task_id` (cascade-deleted with the task), `title`, `done`, `created_by`, `created_at`. `Subtask` (in `subtasks.ts`): `id`, `task_id`, `title`, `done`.

## Functions (`tasks.ts`)

- `listTasks(db, projectId)`: a project's tasks ordered `due_date ASC NULLS LAST, id`: earliest due first, undated last, ties (same date, or both undated) in the order added. Done and open tasks sort the same way.
- `getTask(db, id)`: one task, or `undefined`.
- `addTask(db, projectId, title, userId, dueDate = null)`.
- `setDueDate(db, id, dueDate | null)`: sets or clears the due date; returns the task's project id, or `undefined` if no such task.
- `toggleTask(db, id)`: flips `done`; returns the project id, or `undefined`.
- `overdueLabel(days)`: the "Overdue" tag's tooltip text, `"1 day overdue"` or `"<N> days overdue"`.
- `parseDueDate(value)`: reads a submitted "Due date" field. Empty or missing → `null` (no due date); a real `YYYY-MM-DD` calendar date → that string; anything else (wrong shape, a date like 2030-02-30, or year 0000, which Postgres's `date` has no room for though JavaScript's `Date` accepts it) → `undefined`, meaning invalid. Every date it accepts is one Postgres stores.

## Functions (`subtasks.ts`)

- `listSubtasks(db, taskId)`: a task's subtasks in the order added (`ORDER BY id`).
- `addSubtask(db, taskId, title, userId)`.
- `toggleSubtask(db, id)`: flips `done`; returns the subtask's task id, or `undefined`.
- `subtaskProgress(db, projectId)`: a `Map` from task id to `{ done, total }` for each of the project's tasks that has subtasks; tasks without subtasks are absent.
- `progressLabel({ done, total })`: `"<done>/<total> subtasks done"`, the project page's progress text.

## Routes (`routes.ts`)

Everything under `/tasks/*` and `/subtasks/*` needs a signed-in user (`requireUser` redirects to `/login`).

- `POST /projects/:id/tasks`, fields `title`, `due_date`: adds the task when the title is 1–200 characters and the due date is empty or valid; otherwise adds nothing. Always redirects to the project page. 404 for an unknown project.
- `POST /tasks/:id/toggle`: flips done, redirects to the project. 404 for an unknown task.
- `GET /tasks/:id/edit`: the "Edit task" page. Shows the title (not editable), a "Due date" `<input type="date">` holding the current due date or empty, a "Save" button, then, below that form, a "Subtasks" `<h2>`, then "No subtasks yet." or the list `<ul aria-label="Subtasks">` in the order added (each item: the title in a `<span>`, struck through with class `done` when done, and a "Mark done" / "Reopen" button labelled `Mark done: <title>` / `Reopen: <title>` posting to `/subtasks/:id/toggle`), then the "New subtask" form posting to `/tasks/:id/subtasks` (text input `name="title"`, required, `maxlength="200"`, and an "Add subtask" button), and last a link "Back to <project name>" to the project page. 404 for an unknown task.
- `POST /tasks/:id/edit`, field `due_date`: an empty value clears the due date, a valid date sets it, an invalid one changes nothing. Redirects to the project page. 404 for an unknown task.
- `POST /tasks/:id/subtasks`, field `title`: adds the subtask when the title is 1–200 characters after trimming; otherwise adds nothing. Always redirects to `/tasks/:id/edit`. 404 for an unknown task.
- `POST /subtasks/:id/toggle`: flips the subtask's done, redirects to its task's `/tasks/:taskId/edit`. 404 for an unknown subtask.

## Invariants

- Only the due date is editable after a task is added; titles can't be edited and tasks can't be deleted. Subtasks can't be renamed, deleted or reordered; they go with their task through the cascade.
- A task's done state and its subtasks' done states are independent: toggling one never changes the other. Subtasks never count as tasks: task ordering, overdue counts and the "(N open)" counts read `tasks` only.
- Subtasks go one level deep and have no due date.
- Tasks added before due dates existed have `due_date` null and behave like any undated task.
- "Today" is always the UTC date, the time zone QA and prod run in.

## Tests

`tests/integration/app.test.ts` ("projects and tasks", "due dates", "subtasks") covers these routes on PGlite; `tests/feature/due-dates.spec.ts` and `tests/feature/subtasks.spec.ts` cover the user-visible behaviour.
