# Sign up

**Purpose:** create an account through the "Sign up" page, and log out.

- `signUp(page, email, password)`: fills "Email" and "Password" on `/signup`, presses "Sign up", and waits for the page headed "Projects" with `email` in the banner. Signing up also signs you in.
- `logOut(page)`: presses "Log out" in the banner and waits for the page headed "Log in".

**Inputs:** a Playwright `page` whose `baseURL` is the app; a new email and a password of at least 8 characters.
**Outputs:** none. `signUp` leaves the page on Projects, signed in; `logOut` leaves it on "Log in", signed out.
**Preconditions:** for `signUp`, no account has the email yet (use a unique one, e.g. `jim-nightly-<timestamp>@example.com`); for `logOut`, signed in.
**Flakiness:** none seen. Accounts can't be deleted, so every run leaves its user behind on QA.
