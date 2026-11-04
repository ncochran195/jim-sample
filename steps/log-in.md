# Log in

`log-in.ts`: `logIn(page, email, password)` and `logInAsQaUser(page)`.

- **Purpose:** sign in through the "Log in" page.
- **Inputs:** an email and password; `logInAsQaUser` reads the secrets `QA_USER_EMAIL` and `QA_USER_PASSWORD` instead.
- **Outputs:** none; the page ends on the "Projects" page, signed in.
- **Preconditions:** `baseURL` points at the app. `logInAsQaUser` throws if either secret is unset.
- **Flakiness:** none seen.
