# Projects module (`src/projects/`)

## Purpose

Projects group tasks. Everyone signed in sees every project. This module stores projects and serves the "Projects" page and each project's page.

## Interfaces (`projects.ts`)

- `listProjects(db)`: lists every project, newest first, each with `open_tasks`, its count of tasks that aren't done.
- `getProject(db, id)`: returns `{ id, name }`, or `undefined` if the project doesn't exist.
- `createProject(db, name, userId)`: returns the new project's id.

## Routes (`routes.ts`)

All routes need a signed-in user (`requireUser`).

- `GET /projects`: shows the "Projects" page, with a "New project name" form and the list of projects with their open counts.
- `POST /projects`: a name of 1 to 100 characters (trimmed) creates the project and redirects to its page. Any other name gives 400 with the page and an error line.
- `GET /projects/:id`: shows the project's page, or answers 404. It has:
  - An add-task form posting to `/projects/:id/tasks` (handled in `src/tasks/routes.ts`), with a required "New task" text field (max 200 characters), an optional "Due date" field (`type="date"`, name `due_date`) and an "Add task" button.
  - The "Tasks" list (`<ul aria-label="Tasks">`), or "No tasks yet.". Tasks appear in `listTasks` order: earliest due first, undated last, then the order they were added. Each item shows:
    - the title, struck through when done
    - "Due YYYY-MM-DD" when the task has a due date (`.due`)
    - an "Overdue" tag (`.overdue`) when the task is open and its due date is before today in UTC
    - an "Edit" link to `/tasks/:id/edit` whose accessible name is "Edit: <title>"
    - the toggle button "Mark done: <title>" or "Reopen: <title>"
  - An "All projects" link.

Task storage, validation and the "Edit task" page live in `src/tasks/` (see `src/tasks/context_TASKS.md`).
