# Projects

Everyone signed in sees every project. This module stores projects and renders the "Projects" page and each project's page, which holds the add-task form and the task list.

## `projects.ts`

- `listProjects(db)`: every project, newest first, with `open_tasks`, its count of tasks not done.
- `getProject(db, id)`: `{ id, name }` or `undefined`.
- `createProject(db, name, userId)`: returns the new id.

## `routes.ts`

All `/projects` and `/projects/*` routes need a signed-in user (`requireUser`).

- `GET /projects`: the "New project name" form and the list of projects with their open counts.
- `POST /projects`: a name of 1 to 100 characters creates the project and redirects to it; otherwise 400 with "Give the project a name of 1 to 100 characters."
- `GET /projects/:id`: the project's page, rendered by `projectPage`; 404 for a missing project.

### `projectPage(db, project, email, error?, draft?)`

Exported so the tasks module can re-show the page with an error (status 400 when an added task's due date is invalid). `draft` (`{ title, due }`) refills the add-task form.

- An error line (`role="alert"`) when `error` is given.
- The add-task form, posting to `/projects/:id/tasks`: "New task" (`title`, required, up to 200 characters) and the optional "Due date" (`<input type="date">`, sent as `due`), then "Add task".
- The "Tasks" list (`<ul aria-label="Tasks">`), in `listTasks` order (earliest due date first, undated last, then order added), or "No tasks yet." Each item shows:
  - the title in its own `<span>`, struck through (`.done`) when done;
  - "Due YYYY-MM-DD" in a `.due` span when the task has a due date, and nothing otherwise;
  - an "Overdue" tag (`.overdue`, red) when `isOverdue` says so: open and due before today in UTC;
  - an "Edit" link to `/tasks/:id/edit`, named "Edit: <title>";
  - the toggle button, named "Mark done: <title>" or "Reopen: <title>".
- A link to "All projects".
