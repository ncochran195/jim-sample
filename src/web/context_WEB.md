# Web

Shared page rendering for every screen, in `layout.ts`. Pages are plain server-rendered HTML built with Hono's `html` template, which escapes every interpolated value.

## `layout.ts`

- `page(title, body, signedInAs?)`: the full document: `<title>` "<title> · Tasks", a header with a link home and, when signed in, the user's email and a "Log out" button, then `<main>` with an `<h1>` of the title followed by `body`.
- `errorLine(message?)`: `<p class="error" role="alert">` with the message, or nothing.

## Shared styles (inline `<style>` in `page`)

- Text, email, password and date inputs share one full-width style.
- `.error`: red text for error lines.
- `.done`: struck-through grey, for done task titles.
- `.overdue`: the "Overdue" tag: white text on red (`#b00020`), a small rounded pill.
- `form.inline` keeps a single-button form inline, as the task toggles are.
