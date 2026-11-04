# Create a project

`create-project.ts`: `createProject(page, name)`.

- **Purpose:** create a project with the "New project name" form on the "Projects" page.
- **Inputs:** the project name (1 to 100 characters).
- **Outputs:** the new project page's path, such as `/projects/42`; the page ends on it.
- **Preconditions:** signed in.
- **Flakiness:** none seen. The app can't delete projects, so every run leaves one behind; open it by the returned path rather than by name, since names repeat across runs.
