# Read a project's tasks

`read-tasks.ts`: `readTasks(page)`, `taskItem(page, title)` and `tasksList(page)`.

- **Purpose:** read the project page's "Tasks" list top to bottom, or find the item for one task.
- **Inputs:** for `taskItem`, the task's exact title.
- **Outputs:** `readTasks` returns `{ title, due, overdue, done }` per item: `due` is the date after "Due", or `null`; `overdue` is whether an "Overdue" tag shows; `done` is whether its button reads "Reopen". `taskItem` returns the item's locator.
- **Preconditions:** on a project page.
- **Flakiness:** none seen. Read it only after the page has settled, for example after another Step's wait.
