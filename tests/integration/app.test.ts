import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import type { Db } from "../../src/db/db.js";
import { memoryDb } from "../../src/db/memory.js";

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  db = await memoryDb();
  app = createApp(db);
});
afterEach(() => db.close());

function form(fields: Record<string, string>) {
  return { method: "POST", body: new URLSearchParams(fields) };
}

/** Signs up and returns the session cookie. */
async function signUp(email = "ann@example.com", password = "password123") {
  const res = await app.request("/signup", form({ email, password }));
  expect(res.status).toBe(302);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  expect(cookie).toMatch(/^sid=/);
  return cookie as string;
}

describe("health", () => {
  it("answers ok when the database does", async () => {
    const res = await app.request("/health");
    expect(await res.text()).toBe("ok");
  });
});

describe("auth", () => {
  it("signs up, then lands on projects", async () => {
    const res = await app.request(
      "/signup",
      form({ email: "Ann@Example.com", password: "password123" }),
    );
    expect(res.headers.get("location")).toBe("/projects");
    const users = await db.query<{ email: string }>("SELECT email FROM users");
    expect(users).toEqual([{ email: "ann@example.com" }]);
  });

  it("refuses a short password and a taken email", async () => {
    expect((await app.request("/signup", form({ email: "a@b.c", password: "short" }))).status).toBe(
      400,
    );
    await signUp("ann@example.com");
    const taken = await app.request(
      "/signup",
      form({ email: "ANN@example.com", password: "password123" }),
    );
    expect(taken.status).toBe(400);
    expect(await taken.text()).toContain("already exists");
  });

  it("logs in with the right password only", async () => {
    await signUp("ann@example.com", "password123");
    expect(
      (await app.request("/login", form({ email: "ann@example.com", password: "nope" }))).status,
    ).toBe(401);
    const ok = await app.request(
      "/login",
      form({ email: "ann@example.com", password: "password123" }),
    );
    expect(ok.status).toBe(302);
    expect(ok.headers.get("set-cookie")).toMatch(/HttpOnly/);
  });

  it("logs out by ending the session", async () => {
    const cookie = await signUp();
    await app.request("/logout", { method: "POST", headers: { cookie } });
    const res = await app.request("/projects", { headers: { cookie } });
    expect(res.headers.get("location")).toBe("/login");
  });

  it("sends anyone signed out to the login page", async () => {
    const res = await app.request("/projects");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });
});

describe("projects and tasks", () => {
  it("creates a project, adds a task and marks it done", async () => {
    const cookie = await signUp();
    const created = await app.request("/projects", {
      ...form({ name: "Launch" }),
      headers: { cookie },
    });
    const location = created.headers.get("location") as string;
    expect(location).toMatch(/^\/projects\/\d+$/);

    await app.request(`${location}/tasks`, {
      ...form({ title: "Write <the> copy" }),
      headers: { cookie },
    });
    const page = await (await app.request(location, { headers: { cookie } })).text();
    expect(page).toContain("Write &lt;the&gt; copy");

    const [task] = await db.query<{ id: number }>("SELECT id FROM tasks");
    await app.request(`/tasks/${task?.id}/toggle`, { method: "POST", headers: { cookie } });
    const [after] = await db.query<{ done: boolean }>("SELECT done FROM tasks");
    expect(after?.done).toBe(true);

    const list = await (await app.request("/projects", { headers: { cookie } })).text();
    expect(list).toContain("Launch</a> (0 open)");
  });

  it("refuses a project with no name", async () => {
    const cookie = await signUp();
    const res = await app.request("/projects", { ...form({ name: "  " }), headers: { cookie } });
    expect(res.status).toBe(400);
  });

  it("answers 404 for a project that doesn't exist", async () => {
    const cookie = await signUp();
    expect((await app.request("/projects/999", { headers: { cookie } })).status).toBe(404);
  });
});

describe("task due dates", () => {
  async function projectWithCookie() {
    const cookie = await signUp();
    const created = await app.request("/projects", {
      ...form({ name: "Launch" }),
      headers: { cookie },
    });
    return { cookie, location: created.headers.get("location") as string };
  }

  async function add(cookie: string, location: string, fields: Record<string, string>) {
    return app.request(`${location}/tasks`, { ...form(fields), headers: { cookie } });
  }

  it("stores a valid due date and refuses an invalid one", async () => {
    const { cookie, location } = await projectWithCookie();
    expect((await add(cookie, location, { title: "Dated", due_date: "2030-06-15" })).status).toBe(
      302,
    );
    for (const due_date of ["2030-02-30", "soon", "2030-6-15", "0000-01-01"]) {
      expect((await add(cookie, location, { title: "Bad", due_date })).status).toBe(400);
    }
    expect((await add(cookie, location, { title: "Blank", due_date: "" })).status).toBe(302);
    expect(
      (await add(cookie, location, { title: "Early year", due_date: "0050-01-01" })).status,
    ).toBe(302);
    const rows = await db.query<{ title: string; due: string | null }>(
      "SELECT title, to_char(due_date, 'YYYY-MM-DD') AS due FROM tasks ORDER BY id",
    );
    expect(rows).toEqual([
      { title: "Dated", due: "2030-06-15" },
      { title: "Blank", due: null },
      { title: "Early year", due: "0050-01-01" },
    ]);
  });

  it("lists earliest due first, undated last, and marks open overdue tasks", async () => {
    const { cookie, location } = await projectWithCookie();
    await add(cookie, location, { title: "Undated" });
    await add(cookie, location, { title: "Later", due_date: "2030-03-01" });
    await add(cookie, location, { title: "Past", due_date: "2020-01-01" });
    const html = await (await app.request(location, { headers: { cookie } })).text();
    const order = ["Past", "Later", "Undated"].map((t) => html.indexOf(`Edit: ${t}`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html).toContain("Due 2020-01-01");
    expect(html.match(/class="overdue"/g)).toHaveLength(1);

    const [past] = await db.query<{ id: number }>("SELECT id FROM tasks WHERE title = 'Past'");
    await app.request(`/tasks/${past?.id}/toggle`, { method: "POST", headers: { cookie } });
    const after = await (await app.request(location, { headers: { cookie } })).text();
    expect(after).not.toContain('class="overdue"');
  });

  it("edits a task's title and due date, keeping its done state", async () => {
    const { cookie, location } = await projectWithCookie();
    await add(cookie, location, { title: "Venue", due_date: "2030-06-15" });
    const [task] = await db.query<{ id: number }>("SELECT id FROM tasks");
    await app.request(`/tasks/${task?.id}/toggle`, { method: "POST", headers: { cookie } });

    const edit = await (
      await app.request(`/tasks/${task?.id}/edit`, { headers: { cookie } })
    ).text();
    expect(edit).toContain('value="2030-06-15"');
    expect(edit).toContain(`href="${location}"`);

    const saved = await app.request(`/tasks/${task?.id}/edit`, {
      ...form({ title: "Big venue", due_date: "" }),
      headers: { cookie },
    });
    expect(saved.headers.get("location")).toBe(location);
    const [row] = await db.query("SELECT title, due_date, done FROM tasks");
    expect(row).toEqual({ title: "Big venue", due_date: null, done: true });
  });

  it("refuses an invalid edit and answers 404 for a missing task", async () => {
    const { cookie, location } = await projectWithCookie();
    await add(cookie, location, { title: "Venue" });
    const [task] = await db.query<{ id: number }>("SELECT id FROM tasks");
    const res = await app.request(`/tasks/${task?.id}/edit`, {
      ...form({ title: "  ", due_date: "" }),
      headers: { cookie },
    });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Give the task a title of 1 to 200 characters");
    const [row] = await db.query<{ title: string }>("SELECT title FROM tasks");
    expect(row?.title).toBe("Venue");
    expect((await app.request("/tasks/999/edit", { headers: { cookie } })).status).toBe(404);
  });
});
