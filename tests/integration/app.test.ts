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
    const res = await app.request(`${location}/tasks`, { ...form(fields), headers: { cookie } });
    expect(res.headers.get("location")).toBe(location);
  }

  async function tasks() {
    return db.query<{ id: number; title: string; due_date: string | null }>(
      "SELECT id, title, to_char(due_date, 'YYYY-MM-DD') AS due_date FROM tasks ORDER BY id",
    );
  }

  it("stores a due date when adding, and none when it's left empty", async () => {
    const { cookie, location } = await projectWithCookie();
    await add(cookie, location, { title: "Book the venue", due_date: "2099-03-01" });
    await add(cookie, location, { title: "Order snacks", due_date: "" });
    await add(cookie, location, { title: "Old form" });
    expect((await tasks()).map((t) => t.due_date)).toEqual(["2099-03-01", null, null]);
  });

  it("refuses to add a task with an invalid due date", async () => {
    const { cookie, location } = await projectWithCookie();
    await add(cookie, location, { title: "Bad", due_date: "2026-02-30" });
    expect(await tasks()).toEqual([]);
  });

  it("shows due dates and Overdue, sorted by due date with undated last", async () => {
    const { cookie, location } = await projectWithCookie();
    await add(cookie, location, { title: "No date" });
    await add(cookie, location, { title: "Later", due_date: "2099-06-01" });
    await add(cookie, location, { title: "Long ago", due_date: "2020-01-15" });
    const html = await (await app.request(location, { headers: { cookie } })).text();
    expect(html).toContain('<label for="due_date">Due date</label>');
    expect(html).toContain("Due 2099-06-01");
    expect(html.match(/Overdue/g)).toHaveLength(1);
    const order = ["Long ago", "Later", "No date"].map((t) => html.indexOf(`>${t}</span>`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html).toContain('aria-label="Edit: No date"');
  });

  it("edits a task's title and due date, and clears the date", async () => {
    const { cookie, location } = await projectWithCookie();
    await add(cookie, location, { title: "Book the venue", due_date: "2099-03-01" });
    const [task] = await tasks();
    const edit = `/tasks/${task?.id}/edit`;

    const pageHtml = await (await app.request(edit, { headers: { cookie } })).text();
    expect(pageHtml).toContain('value="Book the venue"');
    expect(pageHtml).toContain('value="2099-03-01"');

    let res = await app.request(edit, {
      ...form({ title: "  Book the hall ", due_date: "2099-04-10" }),
      headers: { cookie },
    });
    expect(res.headers.get("location")).toBe(location);
    expect(await tasks()).toEqual([
      { id: task?.id, title: "Book the hall", due_date: "2099-04-10" },
    ]);

    res = await app.request(edit, {
      ...form({ title: "Book the hall", due_date: "" }),
      headers: { cookie },
    });
    expect(res.headers.get("location")).toBe(location);
    expect((await tasks())[0]?.due_date).toBeNull();
  });

  it("leaves the task unchanged on an invalid title or due date", async () => {
    const { cookie, location } = await projectWithCookie();
    await add(cookie, location, { title: "Keep me", due_date: "2099-05-20" });
    const [task] = await tasks();
    for (const fields of [
      { title: "", due_date: "2099-01-01" },
      { title: "   ", due_date: "2099-01-01" },
      { title: "x".repeat(201), due_date: "2099-01-01" },
      { title: "Changed", due_date: "2026-02-30" },
    ]) {
      const res = await app.request(`/tasks/${task?.id}/edit`, {
        ...form(fields),
        headers: { cookie },
      });
      expect(res.headers.get("location")).toBe(location);
    }
    expect(await tasks()).toEqual([{ id: task?.id, title: "Keep me", due_date: "2099-05-20" }]);
  });

  it("answers 404 for a task that doesn't exist, and needs sign-in", async () => {
    const cookie = await signUp();
    expect((await app.request("/tasks/999999999/edit", { headers: { cookie } })).status).toBe(404);
    expect(
      (await app.request("/tasks/999999999/edit", { ...form({ title: "x" }), headers: { cookie } }))
        .status,
    ).toBe(404);
    expect((await app.request("/tasks/1/edit")).headers.get("location")).toBe("/login");
  });
});
