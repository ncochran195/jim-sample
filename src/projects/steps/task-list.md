# Task list

**Purpose:** add tasks on a project page, mark them done or reopen them, and read the "Tasks" list back.

- `addTask(page, title, dueDate?)`: fills "New task", and "Due date" when given (YYYY-MM-DD), presses "Add task", and waits for the row.
- `toggleTask(page, title, "Mark done" | "Reopen")`: presses "Mark done: <title>" / "Reopen: <title>" and waits for the opposite button.
- `taskList(page)`, `taskRow(page, title)`, `overdueLine(page)`: locators for the "Tasks" list, one task's row (found by its "Edit: <title>" link, so titles that contain each other don't clash), and the "<N> overdue" line.
- `expectDueDate`, `expectNoDueDate`, `expectOverdue(page, title, bool)`, `expectTaskOrder(page, titles)`: assertions on a row's "Due …" text, its "Overdue" tag, and the rows' exact order.

**Inputs:** a `page` on a project's page; titles and dates.
**Outputs:** none, or locators.
**Preconditions:** signed in and on a project page (see `projects.ts`).
**Flakiness:** none seen. Each action waits for the page to reload with the change.
