# Tasks module (`src/tasks/`)

## Purpose

A task belongs to a project. It has a title, a done state and an optional due date. This module stores tasks, checks their input, and serves the task routes, including the "Edit task" page.

## Data (`tasks` table, `schema/schema.sql`)

- `title text NOT NULL`: 1 to 200 characters after trimming (`MAX_TITLE` in `routes.ts`).
- `done boolean NOT NULL DEFAULT false`.
- `due_date date`, nullable with no default: a calendar date with no time. Tasks from before the column was added have no due date. On QA, stage and prod the column is added by hand with `ALTER TABLE tasks ADD COLUMN due_date date;`.

## Interfaces (`tasks.ts`)

- `Task`: `{ id, project_id, title, done, due_date: string | null, overdue: boolean }`. `due_date` is always `YYYY-MM-DD` text: SQL turns it into text with `to_char`, so no JS `Date` or time zone ever shifts it.
- `parseDueDate(value)`: a missing or blank value gives `null` (no due date). A real calendar date in strict `YYYY-MM-DD` form, from 0001-01-01 to 9999-12-31 (two-digit years such as 0050 included), gives that string; year 0000 is not a real year. Anything else (`2030-02-30`, `soon`, `2030-6-15`) gives `undefined`, meaning invalid.
- `listTasks(db, projectId)`: lists a project's tasks ordered by `due_date ASC NULLS LAST, id`. Earliest due comes first and undated tasks come last. Ties keep the order the tasks were added in. Done tasks are sorted by the same rule, not moved to the end.
- `getTask(db, id)`: returns one task, or `undefined` if it doesn't exist.
- `addTask(db, projectId, title, userId, dueDate = null)`.
- `updateTask(db, id, title, dueDate)`: sets the title and due date. It never changes `done`.
- `toggleTask(db, id)`: flips `done` and returns the task's project id, or `undefined` if the task doesn't exist.

## Overdue

A task is `overdue` when it is open (not done), has a due date, and that date is before today's date in UTC (`(now() AT TIME ZONE 'UTC')::date`). The database computes this in SQL. A task due today is not overdue, and a done task never is.

## Routes (`routes.ts`)

All routes need a signed-in user (`requireUser` on `/tasks/*`; `/projects/*` is covered by the projects module).

- `POST /projects/:id/tasks`, with form fields `title` and optional `due_date`: answers 404 for an unknown project. An invalid `due_date` gives 400 with a short error page, and no task is added. Otherwise, a valid title (1 to 200 characters) adds the task and an invalid one is silently ignored. Both cases redirect to the project page.
- `POST /tasks/:id/toggle`: flips done and redirects to the project page, or answers 404.
- `GET /tasks/:id/edit`: shows the "Edit task" page, with the labelled fields "Title" and "Due date" (`type="date"`, name `due_date`), a "Save task" button and a "Back to project" link to `/projects/<project_id>`. Answers 404 for an unknown task.
- `POST /tasks/:id/edit`, with `title` and `due_date`: answers 404 for an unknown task. An empty or whitespace-only title, a title over 200 characters, or an invalid due date gives 400. The "Edit task" page is shown again with the submitted values and the alert "Give the task a title of 1 to 200 characters and a valid due date, or none.", and the task is unchanged. Otherwise it saves the title and due date (blank clears the date) and redirects to the project page.

## Where tasks are shown

The project page (`src/projects/routes.ts`) renders the "Tasks" list from `listTasks` and the add form that posts here. See `src/projects/context_PROJECTS.md`.
