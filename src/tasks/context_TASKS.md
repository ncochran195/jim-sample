# Tasks

The tasks on each project: adding them and marking them done or open again.

## Behaviour

- A task belongs to exactly one project (`tasks.project_id`), and is listed on that project's page, oldest first (by `id`).
- A task has a title of 1 to 200 characters, trimmed. A blank or longer title is ignored: the page reloads with nothing added.
- A task is open or done (`tasks.done`). "Mark done" and "Reopen" flip it, then return to the task's project page.
- Deleting a project deletes its tasks (`ON DELETE CASCADE`).

## Interfaces

- `listTasks(db, projectId)`, `addTask(db, projectId, title, userId)` and `toggleTask(db, id)` in `tasks.ts`; `toggleTask` returns the task's project, or undefined if there's no such task.
- Routes in `routes.ts`, every one signed-in only: `POST /projects/:id/tasks` adds a task; `POST /tasks/:id/toggle` flips one. An unknown project or task is a 404.
- The project page that lists tasks is the projects module's (`src/projects/routes.ts`).
