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

  it("shows due dates, marks open overdue tasks and lists soonest due first", async () => {
    const cookie = await signUp();
    const created = await app.request("/projects", {
      ...form({ name: "Home" }),
      headers: { cookie },
    });
    const location = created.headers.get("location") as string;
    const add = (title: string, due_date = "") =>
      app.request(`${location}/tasks`, { ...form({ title, due_date }), headers: { cookie } });
    await add("Later", "2031-03-01");
    await add("No date");
    await add("Old", "2020-01-15");
    await add("Also later", "2031-03-01");
    await add("Bad date", "2030-02-30");

    const titles = await db.query<{ title: string }>("SELECT title FROM tasks ORDER BY id");
    expect(titles.map((t) => t.title)).toEqual(["Later", "No date", "Old", "Also later"]);

    const page = await (await app.request(location, { headers: { cookie } })).text();
    const order = ["Old", "Later", "Also later", "No date"].map((t) =>
      page.indexOf(`>${t}</span>`),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(page).toContain("Due 2031-03-01");
    expect(page.match(/Overdue/g)).toHaveLength(1);

    const [old] = await db.query<{ id: number }>("SELECT id FROM tasks WHERE title = 'Old'");
    await app.request(`/tasks/${old?.id}/toggle`, { method: "POST", headers: { cookie } });
    const after = await (await app.request(location, { headers: { cookie } })).text();
    expect(after).not.toContain("Overdue");
    expect(after).toContain("Due 2020-01-15");
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
