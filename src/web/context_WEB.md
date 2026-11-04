# Web (`src/web/`)

`layout.ts` is the shared HTML frame.

- `page(title, body, signedInAs?)`: the full document, with `<title>` set to "<title> · Tasks", a header (home link, plus the signed-in email and "Log out" when signed in), and the title as the page's `<h1>`. Interpolated values are escaped by `hono/html`.
- `errorLine(message?)`: a `<p class="error" role="alert">`, or nothing.

Styles live inline in the frame's `<style>`. Classes other modules use:

- `.error`: the app's error colour, `#b00020`.
- `.done`: struck through and grey, for done tasks.
- `.tag`: a small outlined label. It's combined with `.error` for the red "Overdue" tag.
- `.due`: the muted "Due <date>" text.
- `form.inline`: for button forms that sit inline.
