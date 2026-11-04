# Mark a task done or reopen it

`toggle-task.ts`: `markDone(page, title)` and `reopen(page, title)`.

- **Purpose:** press "Mark done: <title>" or "Reopen: <title>" on the project page.
- **Inputs:** the task's exact title.
- **Outputs:** none; waits until the task's button has flipped.
- **Preconditions:** on a project page listing the task, open for `markDone` and done for `reopen`.
- **Flakiness:** none seen.
