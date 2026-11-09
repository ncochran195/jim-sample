# Projects

**Purpose:** create a project, or open one, from the Projects page.

- `createProject(page, name)`: fills "New project name", presses "Create project", waits for the page headed with the name. Returns the project page's URL.
- `openProject(page, name)`: on the Projects page, clicks the link named exactly <name> (its "(N open)" count sits outside the link) and waits for the page headed with the name. Returns its URL. Projects are listed newest first, so with duplicate names it opens the newest one.

**Inputs:** a signed-in `page`; the project name.
**Outputs:** the project page's URL; the page is left on the project.
**Preconditions:** signed in (see `steps/log-in.ts`). For `openProject`, the project exists.
**Flakiness:** projects can't be deleted, so names repeat across runs; `openProject` relies on newest-first order.
