# Projects module (`src/projects/`)

## Purpose

Projects and their pages. Everyone signed in sees every project. A project's page is where its tasks are added and listed; the task data and the task routes come from `src/tasks/`.

## Data and functions (`projects.ts`)

- `listProjects(db)`: every project, newest first, with `open_tasks`, its count of tasks not done.
- `getProject(db, id)`: `{ id, name }` or `undefined`.
- `createProject(db, name, userId)`: returns the new id.

## Routes (`routes.ts`)

`/projects` and `/projects/*` need a signed-in user.

- `GET /projects`: the "Projects" page: a "New project name" form and the list of projects, each linking to its page with "(N open)". No due dates or overdue counts here.
- `POST /projects`: creates a project with a name of 1–100 characters and redirects to it; otherwise re-renders with an error and status 400.
- `GET /projects/:id`: the project's page, headed with its name, top to bottom:
  1. The "New task" form posting to `/projects/:id/tasks`: "New task" text input (required, up to 200 characters), an optional "Due date" `<input type="date">` (name `due_date`), and an "Add task" button.
  2. The overdue count: a paragraph `<N> overdue` (class `overdue-count`), where N is the number of listed tasks with `overdue` true (open, due before today in UTC). Left out entirely when N is 0, including when there are no tasks.
  3. "No tasks yet." when the project has none, otherwise the list `<ul aria-label="Tasks">` in `listTasks` order (earliest due first, undated last, ties in the order added). Each item shows:
     - the title in its own `<span>`, struck through (class `done`) when done;
     - `Due YYYY-MM-DD` (class `due`) when it has a due date;
     - an `Overdue` tag (class `overdue`) when the task is overdue;
     - an "Edit" link to `/tasks/:id/edit`, labelled for screen readers `Edit: <title>`;
     - a "Mark done" / "Reopen" button, labelled `Mark done: <title>` / `Reopen: <title>`, posting to `/tasks/:id/toggle`.
  4. A link back to "All projects".

  404 for an unknown project.

## Invariants

- All page text is rendered through `hono/html`, which escapes interpolated values.
- The overdue tag and the overdue count use the same `overdue` flag from `src/tasks/`, so they always agree.
