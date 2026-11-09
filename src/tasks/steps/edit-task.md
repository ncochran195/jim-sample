# Edit task

**Purpose:** change a task's due date on the "Edit task" page.

- `openEditTask(page, title)`: on a project page, presses the "Edit: <title>" link and waits for the page headed "Edit task".
- `saveDueDate(page, dueDate)`: fills "Due date" (YYYY-MM-DD, or `""` to clear it), presses "Save", and waits to leave the edit page.
- `backToProject(page, projectName)`: presses "Back to <project name>" without saving and waits for the project page.

**Inputs:** a signed-in `page`; the task's title, a date, the project's name.
**Outputs:** none. After `saveDueDate` the app redirects to the project page.
**Preconditions:** on the task's project page (for `openEditTask`) or its "Edit task" page.
**Flakiness:** none seen.
