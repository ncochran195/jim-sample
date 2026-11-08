# Projects

Every signed-in person sees every project. A project has a name and holds tasks (see `src/tasks/context_TASKS.md`).

## Behaviours

- **Projects page** (`GET /projects`): a form to create a project ("New project name", "Create project") and the list of projects, newest first, each with its count of open (not done) tasks.
- **Creating a project** (`POST /projects`): the name is trimmed and must be 1 to 100 characters; otherwise the page re-renders with an error and status 400. On success it redirects to the new project's page.
- **Project page** (`GET /projects/:id`, 404 if unknown): a form to add a task, with a "New task" text field (required, up to 200 characters), an optional "Due date" date field that starts empty, and "Add task". Below it, the task list (`<ul aria-label="Tasks">`, or "No tasks yet."), in `listTasks` order: soonest due first, undated last. Each item shows the title (struck through when done), "Due YYYY-MM-DD" only when the task has a due date, "Overdue" only when it's overdue (due before today and not done), and a "Mark done" / "Reopen" button labelled with the task's title, e.g. "Mark done: Pay rent".

## Interfaces

- `projects.ts`: `listProjects(db)`, `getProject(db, id)`, `createProject(db, name, userId)`.
- `routes.ts`: `projectRoutes(app, db)`; every route needs a signed-in user.

Pages are rendered with `page()` from `src/web/layout.ts`, whose styles include `.done`, `.due` and `.overdue`. Interpolated values are escaped.
