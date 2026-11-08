# Projects

The team's projects: the projects page, creating a project, and each project's own page.

## Behaviour

- Every signed-in user sees every project: the team shares them.
- The projects page (`GET /projects`) lists projects newest first, each with its count of open tasks, "(N open)", counted from the tasks table on every load.
- A project's name is 1 to 100 characters, trimmed. A bad name shows "Give the project a name of 1 to 100 characters." and a 400.
- A project's page (`GET /projects/:id`) has the "New task" form, then its tasks, each with a "Mark done" or "Reopen" button, then a link back to all projects. An unknown project is a 404.

## Interfaces

- `listProjects(db)` (with `open_tasks`), `getProject(db, id)` and `createProject(db, name, userId)` in `projects.ts`.
- Routes in `routes.ts`. The project page reads its tasks through the tasks module's `listTasks`.
