# Log in

**Purpose:** sign in as a user through the "Log in" page.

**Inputs:** `page`; `email`; `password` (pass the secrets `QA_USER_EMAIL` and `QA_USER_PASSWORD` by name).

**Outputs:** none. The page ends on the "Projects" page (`/projects`), signed in.

**Preconditions:** the user exists.

**Flakiness:** none seen. If a later Step lands on `/login`, the session has expired: run this again.
