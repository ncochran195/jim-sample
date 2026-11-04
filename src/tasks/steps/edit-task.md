# Edit a task

**Purpose:** change a task's title or due date on its "Edit task" page.

**Functions:**
- `openEditTask(page, title)`: presses the task's "Edit: <title>" link on its project's page and waits for `/tasks/:id/edit`.
- `saveTask(page, { title?, due? })`: fills "Title" and/or "Due date" (`""` clears it) and presses "Save". To send a value the browser would block, run `steps/loosen-input.ts` first.

**Outputs:** `saveTask` returns the status the post answered: 302 when it redirected back to the project, 400 when the "Edit task" page shows an error. The page ends on whatever the post led to, loaded.

**Preconditions:** signed in; `openEditTask` needs the project's page, `saveTask` the "Edit task" page.

**Flakiness:** none.
