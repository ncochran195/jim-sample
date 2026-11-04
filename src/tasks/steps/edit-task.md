# Edit a task

`edit-task.ts`: `openEditTask(page, title)` and `saveTask(page, changes)`.

- **Purpose:** open a task's "Edit task" page with its "Edit: <title>" button, then change its "Title" and/or "Due date" and press "Save".
- **Inputs:** the task's exact title; `changes` is `{ title?, dueDate?, bypassRequired? }`, where `dueDate: ""` clears the date and `bypassRequired` removes the "Title" field's `required` attribute so a blank title can be submitted.
- **Outputs:** none; `openEditTask` ends on the "Edit task" page, `saveTask` on the page the app redirects to (the project page).
- **Preconditions:** `openEditTask` needs a project page listing the task; `saveTask` needs the "Edit task" page.
- **Flakiness:** none seen.
