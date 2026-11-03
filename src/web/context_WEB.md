# Web module (`src/web/`)

## Purpose

The shared HTML frame and small bits of markup that every page uses. Pages are plain server-rendered HTML forms, built with Hono's `html` tagged template, which escapes every interpolated value.

## Interfaces (`layout.ts`)

- `page(title, body, signedInAs?)`: wraps `body` in the full document. It shows a header with a "Tasks" home link, plus the signed-in email and a "Log out" button when `signedInAs` is given, and an `<h1>` of `title`. The `<title>` is `<title> · Tasks`.
- `errorLine(message?)`: renders `<p class="error" role="alert">` with the message, or nothing when there is no message.

## Styles (inline in `page`)

- Text, email, password and date inputs are full width.
- `form.inline` puts a form inline, used for the task toggle buttons.
- `.error` is error red (`#b00020`).
- `.done` strikes through and greys a done task.
- `.due` is a task's muted due date text.
- `.overdue` is the "Overdue" tag: white bold text on the error red, in a small rounded pill.
