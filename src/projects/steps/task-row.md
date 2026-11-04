# Read the task list

**Purpose:** find tasks in a project's "Tasks" list, to check what each shows.

**Inputs:** `page`; for `taskRow`, the task's exact `title`.

**Outputs:** `taskList(page)`: the "Tasks" list. `taskRow(page, title)`: the list item whose title is exactly `title` (so "Order snacks" doesn't match "Order snacks and drinks"); check its text, such as `Due 2099-03-15` or the `Overdue` tag, on it. `taskTitles(page)`: the titles top to bottom, read from each item's first `<span>`.

**Preconditions:** on a project's page.

**Flakiness:** none. `taskTitles` relies on the title being the item's first `<span>`, as `context_PROJECTS.md` describes.
