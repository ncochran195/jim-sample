# Tasks

The tasks inside a project: adding them, with an optional due date, marking them done or reopening them, and listing them for the project page.

## Behaviours

- **Adding a task** (`POST /projects/:id/tasks`, signed in): the form sends `title` and `due_date`. The title is trimmed and must be 1 to 200 characters. `due_date` is optional: empty means no due date, otherwise it must be a real calendar day as `YYYY-MM-DD` (what a browser's date input sends). A missing title, a title too long or an invalid due date adds nothing; every case redirects back to the project page. An unknown project answers 404.
- **Done and reopened** (`POST /tasks/:id/toggle`, signed in): flips `done` and redirects to the task's project; an unknown task answers 404.
- **Listing** (`listTasks`): a project's tasks, soonest due first, undated tasks last. Tasks with the same due date, or none, keep the order they were added in (by `id`).
- **Overdue:** a task is overdue when its due date is before today and it isn't done. A task due today isn't overdue. "Today" is the database's `CURRENT_DATE`, so the database server's time zone decides it. An overdue task is overdue by the days from its due date to today: a task due yesterday is 1 day overdue.

## Interfaces (`tasks.ts`)

- `Task`: `id`, `project_id`, `title`, `done`, `due_date` (`"YYYY-MM-DD"` or `null`), `overdue` and `days_overdue` (computed, never stored; `days_overdue` is 0 unless the task is overdue).
- `overdueFor(days)`: the overdue marker's tooltip, "1 day overdue" or "N days overdue".
- `listTasks(db, projectId)`: the ordered list above, with `due_date` formatted by SQL (`to_char`), so it's never a JS `Date` and never shifts by time zone.
- `parseDueDate(raw)`: `null` for an empty field, the day for a valid `YYYY-MM-DD`, `undefined` for anything else.
- `addTask(db, projectId, title, userId, dueDate = null)`.
- `toggleTask(db, id)`: the task's project id, or `undefined` if there's no such task.

## Data

The `tasks` table in `schema/schema.sql`: `due_date date` is nullable. Tasks can't be edited yet, so a due date is set only when the task is added.

## Used by

`src/projects/routes.ts` renders the project page from `listTasks`; `src/projects/projects.ts` counts open tasks per project straight from the table.
