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

  async function tasks() {
    return db.query<{ id: number; title: string; due: string | null }>(
      "SELECT id, title, to_char(due_date, 'YYYY-MM-DD') AS due FROM tasks ORDER BY id",
    );
  }

  it("adds a task with or without a due date", async () => {
    const { cookie, location } = await projectWithCookie();
    for (const fields of [
      { title: "Dated", due: "2099-03-15" },
      { title: "Undated", due: "" },
    ]) {
      const res = await app.request(`${location}/tasks`, { ...form(fields), headers: { cookie } });
      expect(res.status).toBe(302);
    }
    expect(await tasks()).toMatchObject([
      { title: "Dated", due: "2099-03-15" },
      { title: "Undated", due: null },
    ]);
  });

  it("refuses an invalid due date when adding", async () => {
    const { cookie, location } = await projectWithCookie();
    for (const due of ["2026-02-30", "soon", "2025-13-01", "0000-01-01"]) {
      const res = await app.request(`${location}/tasks`, {
        ...form({ title: "Bad", due }),
        headers: { cookie },
      });
      expect(res.status).toBe(400);
      expect(await res.text()).toContain("Give the due date as a real date, or leave it empty.");
    }
    expect(await tasks()).toEqual([]);
  });

  it("accepts a leap day only in a leap year", async () => {
    const { cookie, location } = await projectWithCookie();
    const leap = await app.request(`${location}/tasks`, {
      ...form({ title: "Leap", due: "2028-02-29" }),
      headers: { cookie },
    });
    expect(leap.status).toBe(302);
    const notLeap = await app.request(`${location}/tasks`, {
      ...form({ title: "Not leap", due: "2100-02-29" }),
      headers: { cookie },
    });
    expect(notLeap.status).toBe(400);
  });

  it("lists by due date, undated last, and marks open past-due tasks overdue", async () => {
    const { cookie, location } = await projectWithCookie();
    for (const [title, due] of [
      ["Later", "2099-06-01"],
      ["None", ""],
      ["Past", "2020-01-15"],
    ] as const) {
      await app.request(`${location}/tasks`, { ...form({ title, due }), headers: { cookie } });
    }
    const page = await (await app.request(location, { headers: { cookie } })).text();
    const order = ["Past", "Later", "None"].map((t) => page.indexOf(`>${t}</span>`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(page).toContain("Due 2020-01-15");
    expect(page.match(/class="overdue"/g)).toHaveLength(1);

    const past = (await tasks()).find((t) => t.title === "Past");
    await app.request(`/tasks/${past?.id}/toggle`, { method: "POST", headers: { cookie } });
    const done = await (await app.request(location, { headers: { cookie } })).text();
    expect(done).not.toContain('class="overdue"');
  });

  it("edits a task's title and due date", async () => {
    const { cookie, location } = await projectWithCookie();
    await app.request(`${location}/tasks`, {
      ...form({ title: "Book <the> venue", due: "2099-03-15" }),
      headers: { cookie },
    });
    const [task] = await tasks();
    const edit = await app.request(`/tasks/${task?.id}/edit`, { headers: { cookie } });
    const body = await edit.text();
    expect(body).toContain('value="Book &lt;the&gt; venue"');
    expect(body).toContain('value="2099-03-15"');

    const saved = await app.request(`/tasks/${task?.id}/edit`, {
      ...form({ title: "Book the hall", due: "" }),
      headers: { cookie },
    });
    expect(saved.headers.get("location")).toBe(location);
    expect(await tasks()).toMatchObject([{ title: "Book the hall", due: null }]);
  });

  it("refuses a bad title or due date when editing, leaving the task as it was", async () => {
    const { cookie, location } = await projectWithCookie();
    await app.request(`${location}/tasks`, {
      ...form({ title: "Keep", due: "2099-03-15" }),
      headers: { cookie },
    });
    const [task] = await tasks();
    for (const [fields, error] of [
      [{ title: "  ", due: "" }, "Give the task a title of 1 to 200 characters."],
      [{ title: "x".repeat(201), due: "" }, "Give the task a title of 1 to 200 characters."],
      [{ title: "New", due: "soon" }, "Give the due date as a real date, or leave it empty."],
    ] as const) {
      const res = await app.request(`/tasks/${task?.id}/edit`, {
        ...form(fields),
        headers: { cookie },
      });
      expect(res.status).toBe(400);
      expect(await res.text()).toContain(error);
    }
    expect(await tasks()).toMatchObject([{ title: "Keep", due: "2099-03-15" }]);
  });

  it("answers 404 for editing a task that doesn't exist", async () => {
    const cookie = await signUp();
    expect((await app.request("/tasks/999999999/edit", { headers: { cookie } })).status).toBe(404);
    const posted = await app.request("/tasks/999999999/edit", {
      ...form({ title: "Ghost", due: "" }),
      headers: { cookie },
    });
    expect(posted.status).toBe(404);
  });
});
