# Log in

**Purpose:** sign in through the "Log in" page.

- `logIn(page, email, password)`: fills "Email" and "Password", presses "Log in", and waits for the page headed "Projects".
- `logInAsQaUser(page)`: the same, with the `QA_USER_EMAIL` and `QA_USER_PASSWORD` secrets from the environment.

**Inputs:** a Playwright `page` whose `baseURL` is the app; the credentials.
**Outputs:** none; the page is left on the Projects page, signed in.
**Preconditions:** the user exists. Throws if the QA secrets aren't set.
**Flakiness:** none seen.
