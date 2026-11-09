# Web module (`src/web/`)

## Purpose

The page frame and shared styling every screen uses (`layout.ts`).

## Interfaces

- `page(title, body, signedInAs?)`: the full HTML document: a header with a "Tasks" home link and, when signed in, the email and a "Log out" button; then `<main>` with an `<h1>` of the title and the body. The `<title>` is "<title> · Tasks". Interpolated values are escaped.
- `errorLine(message?)`: a `<p class="error" role="alert">` for a message, or nothing.

## Styles (inline `<style>` in the page head)

- Text, email, password and date inputs are full width.
- `.error`: the error colour, `#b00020`.
- `.done`: struck through and grey, for done tasks.
- `.due`: a task's "Due YYYY-MM-DD" text, muted, spaced from the title.
- `.overdue`: the "Overdue" tag: white bold text on the error colour, as a small rounded badge, so it stands apart from the title.
- `.overdue-count`: the "N overdue" line above a project's task list, bold in the error colour.
- `form.inline`: forms shown inline, such as the "Mark done" buttons and "Log out".
