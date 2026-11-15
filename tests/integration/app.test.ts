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

describe("due dates", () => {
  async function projectWithCookie() {
    const cookie = await signUp();
    const created = await app.request("/projects", {
      ...form({ name: "Launch" }),
      headers: { cookie },
    });
    return { cookie, location: created.headers.get("location") as string };
  }

  function utcDate(offset: number) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  it("stores a due date, or none, when a task is added", async () => {
    const { cookie, location } = await projectWithCookie();
    const add = (fields: Record<string, string>) =>
      app.request(`${location}/tasks`, { ...form(fields), headers: { cookie } });
    await add({ title: "Dated", due_date: "2030-01-15" });
    await add({ title: "Undated", due_date: "" });
    await add({ title: "No field" });
    const rows = await db.query<{ title: string; due_date: string | null }>(
      "SELECT title, to_char(due_date, 'YYYY-MM-DD') AS due_date FROM tasks ORDER BY id",
    );
    expect(rows).toEqual([
      { title: "Dated", due_date: "2030-01-15" },
      { title: "Undated", due_date: null },
      { title: "No field", due_date: null },
    ]);
  });

  it("refuses a task whose due date isn't a real date", async () => {
    const { cookie, location } = await projectWithCookie();
    for (const due_date of ["2030-02-30", "tomorrow", "2030-1-5", "0000-01-01"]) {
      const res = await app.request(`${location}/tasks`, {
        ...form({ title: "Bad", due_date }),
        headers: { cookie },
      });
      expect(res.headers.get("location")).toBe(location);
    }
    expect(await db.query("SELECT id FROM tasks")).toEqual([]);
  });

  it("lists by due date, undated last, and marks and counts open overdue tasks", async () => {
    const { cookie, location } = await projectWithCookie();
    const add = (title: string, due_date = "") =>
      app.request(`${location}/tasks`, { ...form({ title, due_date }), headers: { cookie } });
    await add("Undated");
    await add("Late", utcDate(-1));
    await add("Today", utcDate(0));
    await add("Done late", utcDate(-3));
    await add("Very late", utcDate(-3));
    const [doneLate] = await db.query<{ id: number }>(
      "SELECT id FROM tasks WHERE title = 'Done late'",
    );
    await app.request(`/tasks/${doneLate?.id}/toggle`, { method: "POST", headers: { cookie } });

    const html = await (await app.request(location, { headers: { cookie } })).text();
    const order = ["Done late", "Very late", "Late", "Today", "Undated"].map((t) =>
      html.indexOf(`>${t}<`),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html).toContain(`Due ${utcDate(-1)}`);
    expect(html.match(/>Overdue</g)).toHaveLength(2);
    expect(html).toContain('title="1 day overdue">Overdue<');
    expect(html).toContain('title="3 days overdue">Overdue<');
    expect(html).toContain(">2 overdue<");
  });

  it("shows no overdue count when nothing is overdue", async () => {
    const { cookie, location } = await projectWithCookie();
    const html = await (await app.request(location, { headers: { cookie } })).text();
    expect(html).toContain("No tasks yet.");
    expect(html).not.toMatch(/\d+ overdue|>Overdue</);
  });

  it("edits, then clears, a task's due date", async () => {
    const { cookie, location } = await projectWithCookie();
    await app.request(`${location}/tasks`, {
      ...form({ title: "Book the venue", due_date: "2030-01-15" }),
      headers: { cookie },
    });
    const [task] = await db.query<{ id: number }>("SELECT id FROM tasks");
    const edit = `/tasks/${task?.id}/edit`;

    const pageHtml = await (await app.request(edit, { headers: { cookie } })).text();
    expect(pageHtml).toContain("Edit task");
    expect(pageHtml).toContain('value="2030-01-15"');
    expect(pageHtml).toContain(`href="${location}"`);

    const saved = await app.request(edit, {
      ...form({ due_date: "2030-03-01" }),
      headers: { cookie },
    });
    expect(saved.headers.get("location")).toBe(location);
    const due = () =>
      db.query<{ due_date: string | null }>(
        "SELECT to_char(due_date, 'YYYY-MM-DD') AS due_date FROM tasks",
      );
    expect(await due()).toEqual([{ due_date: "2030-03-01" }]);

    for (const due_date of ["not a date", "2030-02-30", "0000-01-01"]) {
      const refused = await app.request(edit, { ...form({ due_date }), headers: { cookie } });
      expect(refused.headers.get("location")).toBe(location);
    }
    expect(await due()).toEqual([{ due_date: "2030-03-01" }]);

    await app.request(edit, { ...form({ due_date: "" }), headers: { cookie } });
    expect(await due()).toEqual([{ due_date: null }]);
  });

  it("answers 404 for editing a task that doesn't exist, and asks signed-out people to log in", async () => {
    const cookie = await signUp();
    expect((await app.request("/tasks/999/edit", { headers: { cookie } })).status).toBe(404);
    expect(
      (await app.request("/tasks/999/edit", { ...form({ due_date: "" }), headers: { cookie } }))
        .status,
    ).toBe(404);
    const signedOut = await app.request("/tasks/1/edit");
    expect(signedOut.headers.get("location")).toBe("/login");
  });
});

describe("subtasks", () => {
  /** Signs up, creates a project with one task, and returns the task's edit page. */
  async function taskWithCookie(title = "Plan offsite") {
    const cookie = await signUp();
    const created = await app.request("/projects", {
      ...form({ name: "Offsite" }),
      headers: { cookie },
    });
    const location = created.headers.get("location") as string;
    await app.request(`${location}/tasks`, { ...form({ title }), headers: { cookie } });
    const [task] = await db.query<{ id: number }>("SELECT id FROM tasks ORDER BY id DESC LIMIT 1");
    return { cookie, location, id: task?.id as number, edit: `/tasks/${task?.id}/edit` };
  }

  const titles = () =>
    db.query<{ title: string; done: boolean }>("SELECT title, done FROM subtasks ORDER BY id");

  it("shows an empty Subtasks section on the edit page", async () => {
    const { cookie, edit } = await taskWithCookie();
    const html = await (await app.request(edit, { headers: { cookie } })).text();
    expect(html).toContain("<h2>Subtasks</h2>");
    expect(html).toContain("No subtasks yet.");
    expect(html).toContain('<label for="subtask_title">New subtask</label>');
    expect(html).toMatch(/name="title" type="text" maxlength="200" required/);
  });

  it("adds trimmed subtasks in order, refusing empty and over-long titles", async () => {
    const { cookie, id, edit } = await taskWithCookie();
    const add = (title: string) =>
      app.request(`/tasks/${id}/subtasks`, { ...form({ title }), headers: { cookie } });
    for (const title of ["  Book a venue  ", "", "   ", "a".repeat(201), "a".repeat(200)]) {
      expect((await add(title)).headers.get("location")).toBe(edit);
    }
    expect(await titles()).toEqual([
      { title: "Book a venue", done: false },
      { title: "a".repeat(200), done: false },
    ]);
    const html = await (await app.request(edit, { headers: { cookie } })).text();
    expect(html).toContain('<ul aria-label="Subtasks">');
    expect(html).not.toContain("No subtasks yet.");
    expect(html).toContain('aria-label="Mark done: Book a venue"');
  });

  it("escapes subtask titles", async () => {
    const { cookie, id, edit } = await taskWithCookie();
    await app.request(`/tasks/${id}/subtasks`, {
      ...form({ title: "<b>bold</b>" }),
      headers: { cookie },
    });
    const html = await (await app.request(edit, { headers: { cookie } })).text();
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>bold</b>");
  });

  it("toggles a subtask and shows progress on the project page, never counting it as a task", async () => {
    const { cookie, id, edit, location } = await taskWithCookie();
    await app.request(`${location}/tasks`, {
      ...form({ title: "Write minutes" }),
      headers: { cookie },
    });
    for (const title of ["Book a venue", "Send invites", "Order food"]) {
      await app.request(`/tasks/${id}/subtasks`, { ...form({ title }), headers: { cookie } });
    }
    const [first] = await db.query<{ id: number }>("SELECT id FROM subtasks ORDER BY id LIMIT 1");
    const toggled = await app.request(`/subtasks/${first?.id}/toggle`, {
      method: "POST",
      headers: { cookie },
    });
    expect(toggled.headers.get("location")).toBe(edit);
    expect((await titles()).map((s) => s.done)).toEqual([true, false, false]);

    const editHtml = await (await app.request(edit, { headers: { cookie } })).text();
    expect(editHtml).toContain('<span class="done">Book a venue</span>');
    expect(editHtml).toContain('aria-label="Reopen: Book a venue"');

    const projectHtml = await (await app.request(location, { headers: { cookie } })).text();
    expect(projectHtml).toContain('<span class="subtasks">1/3 subtasks done</span>');
    expect(projectHtml.match(/subtasks done/g)).toHaveLength(1);

    await app.request(`/tasks/${id}/toggle`, { method: "POST", headers: { cookie } });
    expect((await titles()).map((s) => s.done)).toEqual([true, false, false]);
    const projects = await (await app.request("/projects", { headers: { cookie } })).text();
    expect(projects).toContain("(1 open)");
  });

  it("answers 404 for unknown tasks and subtasks, and asks signed-out people to log in", async () => {
    const cookie = await signUp();
    const post = { ...form({ title: "x" }), headers: { cookie } };
    expect((await app.request("/tasks/999/subtasks", post)).status).toBe(404);
    expect((await app.request("/subtasks/999/toggle", post)).status).toBe(404);
    const signedOut = await app.request("/subtasks/1/toggle", { method: "POST" });
    expect(signedOut.headers.get("location")).toBe("/login");
  });
});
