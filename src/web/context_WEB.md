# Web

The shared page frame every screen renders through. The app serves plain HTML forms; there is no client-side script.

## Interfaces (`layout.ts`)

- `page(title, body, signedInAs?)`: the full HTML document: a header with a link home and, when signed in, the user's email and a "Log out" button; then an `<h1>` of the title and the body. Interpolated values are escaped by Hono's `html` tag.
- `errorLine(message?)`: a `<p class="error" role="alert">` when there's a message, otherwise nothing.

## Styles

One inline stylesheet in `page()`. Classes other modules use: `inline` (forms shown inline, such as a task's toggle button), `error`, `done` (a done task's title, struck through), `due` (a task's "Due YYYY-MM-DD") and `overdue` (a task's "Overdue" mark, in the error colour).
