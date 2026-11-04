# Open a project

`open-project.ts`: `openProjectFromList(page, name)` and `openProject(page, path)`.

- **Purpose:** open a project's page, either by following its link on the "Projects" page or by its path.
- **Inputs:** the exact project name, or its path such as `/projects/42`.
- **Outputs:** `openProjectFromList` returns the project's path. The page ends on the project page.
- **Preconditions:** signed in; the project exists. With several projects of one name, `openProjectFromList` takes the first (newest).
- **Flakiness:** none seen.
