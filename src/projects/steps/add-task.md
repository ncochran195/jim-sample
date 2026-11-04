# Add a task

**Purpose:** add a task to a project with the add-task form on its page.

**Inputs:** `page`; `title`, typed into "New task"; `due` (optional), typed into "Due date". A date input takes `YYYY-MM-DD`; to send a value that isn't a date, run `steps/loosen-input.ts` on "Due date" with `type: "text"` first.

**Outputs:** the status the form post answered: 302 when it redirected back to the project, 400 when the page shows an error. The page ends on whatever the post led to, loaded.

**Preconditions:** signed in, on the project's page.

**Flakiness:** none.
