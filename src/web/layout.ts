import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

type Content = HtmlEscapedString | Promise<HtmlEscapedString>;

/** The page frame every screen shares. Interpolated values are escaped. */
export function page(title: string, body: Content, signedInAs?: string) {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} · Tasks</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
      header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
      form.inline { display: inline; }
      label { display: block; margin-top: 0.75rem; }
      input[type="text"], input[type="email"], input[type="password"] { width: 100%; padding: 0.4rem; box-sizing: border-box; }
      button { margin-top: 0.75rem; padding: 0.4rem 0.9rem; }
      .error { color: #b00020; }
      .done { text-decoration: line-through; color: #666; }
      .due { color: #555; margin-left: 0.5rem; }
      .overdue { color: #b00020; margin-left: 0.5rem; }
      ul { padding-left: 1.2rem; }
    </style>
  </head>
  <body>
    <header>
      <a href="/">Tasks</a>
      ${
        signedInAs
          ? html`<span>${signedInAs}
              <form class="inline" method="post" action="/logout"><button>Log out</button></form></span>`
          : ""
      }
    </header>
    <main>
      <h1>${title}</h1>
      ${body}
    </main>
  </body>
</html>`;
}

export function errorLine(message?: string) {
  return message ? html`<p class="error" role="alert">${message}</p>` : "";
}
