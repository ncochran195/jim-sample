# Create a project

**Purpose:** create a project through the "Projects" page.

**Inputs:** `page`; `name` (1 to 100 characters; on QA, start it with the run's name prefix).

**Outputs:** the new project's path, such as `/projects/12`. The page ends on the project's page.

**Preconditions:** signed in.

**Flakiness:** none. The app has no way to delete a project, so projects this creates stay on QA.
