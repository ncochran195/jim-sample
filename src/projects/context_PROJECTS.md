# Projects (`src/projects/`)

Projects group tasks. Everyone signed in sees every project. `/projects` and `/projects/*` require sign-in.

## Data (`projects.ts`)

- `listProjects(db)`: every project, newest first, each with `open_tasks`, its count of tasks not done.
- `getProject(db, id)`: `{ id, name }` or `undefined`.
- `createProject(db, name, userId)`: returns the new id.

## Routes (`routes.ts`)

- `GET /projects`: the "Projects" page, with the "New project name" form and the list of projects as links with "(n open)".
- `POST /projects`: creates a project named 1 to 100 characters (trimmed) and redirects to it. Otherwise it re-renders the page with an error, status 400.
- `GET /projects/:id`: the project page, or 404. It has:
  - a "New task" form posting to `/projects/:id/tasks`, with a "New task" title field, a "Due date" field (`<input type="date" name="due_date">`) and an "Add task" button;
  - the `Tasks` list (`<ul aria-label="Tasks">`), in `listTasks` order (by due date, undated last, then by order added). Each item shows:
    - the title, struck through (`.done`) when the task is done;
    - "Due YYYY-MM-DD" when the task has a due date;
    - an "Overdue" tag (`.tag.error`, the app's error colour) when `isOverdue` holds against today's UTC date;
    - a "Mark done"/"Reopen" button, labelled "Mark done: <title>" or "Reopen: <title>";
    - an "Edit" button, labelled "Edit: <title>", a GET form to `/tasks/:id/edit`.

  Shows "No tasks yet." when the project has no tasks.
