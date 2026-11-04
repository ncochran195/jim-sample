# Add a task

`add-task.ts`: `addTask(page, title, dueDate?)`.

- **Purpose:** add a task with the project page's "New task" form, with an optional "Due date".
- **Inputs:** the title, and optionally a due date as `YYYY-MM-DD`.
- **Outputs:** none; the page ends back on the project page.
- **Preconditions:** signed in and on a project page.
- **Flakiness:** none seen. The app can't delete tasks, so added tasks stay on QA.
