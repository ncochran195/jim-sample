import type { Context, Hono, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { html } from "hono/html";
import type { Db } from "../db/db.js";
import { errorLine, page } from "../web/layout.js";
import {
  authenticate,
  createUser,
  endSession,
  findUserByEmail,
  startSession,
  type User,
  userForSession,
} from "./users.js";

export type Env = { Variables: { user?: User } };

const COOKIE = "sid";
const MIN_PASSWORD = 8;

/** Loads the signed-in user, if any, into the request context. */
export function loadUser(db: Db): MiddlewareHandler<Env> {
  return async (c, next) => {
    const token = getCookie(c, COOKIE);
    if (token) c.set("user", await userForSession(db, token));
    await next();
  };
}

/** Sends anyone who isn't signed in to the login page. */
export const requireUser: MiddlewareHandler<Env> = async (c, next) => {
  if (!c.get("user")) return c.redirect("/login");
  await next();
};

function signIn(c: Context<Env>, token: string, secure: boolean) {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

function signupForm(email = "", error?: string) {
  return page(
    "Sign up",
    html`${errorLine(error)}
      <form method="post" action="/signup">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" value="${email}" required />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" minlength="${MIN_PASSWORD}" required />
        <button>Sign up</button>
      </form>
      <p>Already have an account? <a href="/login">Log in</a></p>`,
  );
}

function loginForm(email = "", error?: string) {
  return page(
    "Log in",
    html`${errorLine(error)}
      <form method="post" action="/login">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" value="${email}" required />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required />
        <button>Log in</button>
      </form>
      <p>New here? <a href="/signup">Sign up</a></p>`,
  );
}

export function authRoutes(app: Hono<Env>, db: Db, secureCookies: boolean) {
  app.get("/signup", (c) => c.html(signupForm()));

  app.post("/signup", async (c) => {
    const form = await c.req.parseBody();
    const email = String(form.email ?? "").trim();
    const password = String(form.password ?? "");
    if (!email.includes("@")) return c.html(signupForm(email, "Enter a valid email address."), 400);
    if (password.length < MIN_PASSWORD) {
      return c.html(
        signupForm(email, `Use a password of at least ${MIN_PASSWORD} characters.`),
        400,
      );
    }
    if (await findUserByEmail(db, email)) {
      return c.html(signupForm(email, "An account with that email already exists."), 400);
    }
    const user = await createUser(db, email, password);
    signIn(c, await startSession(db, user.id), secureCookies);
    return c.redirect("/projects");
  });

  app.get("/login", (c) => c.html(loginForm()));

  app.post("/login", async (c) => {
    const form = await c.req.parseBody();
    const email = String(form.email ?? "").trim();
    const user = await authenticate(db, email, String(form.password ?? ""));
    if (!user) return c.html(loginForm(email, "Wrong email or password."), 401);
    signIn(c, await startSession(db, user.id), secureCookies);
    return c.redirect("/projects");
  });

  app.post("/logout", async (c) => {
    const token = getCookie(c, COOKIE);
    if (token) await endSession(db, token);
    deleteCookie(c, COOKIE, { path: "/" });
    return c.redirect("/login");
  });
}
