import { expect, type Page, test } from "../../.github/jim/playwright.js";

// Task due dates: an optional due date on add, an "Edit task" page, the due
// date and "Overdue" tag in a project's task list, and earliest-due-first order.

const EDIT_ERROR = "Give the task a title of 1 to 200 characters and a valid due date, or none.";

function uniqueEmail() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** A date in YYYY-MM-DD form, `days` from today in UTC. */
function utcDate(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function signUp(page: Page) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
}

/** Signs up and creates a project, leaving the browser on its page. Returns its path. */
async function newProject(page: Page, name: string) {
  await signUp(page);
  const project = `${name} ${Date.now()}`;
  await page.getByLabel("New project name").fill(project);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: project })).toBeVisible();
  return new URL(page.url()).pathname;
}

/** Adds a task through the project page's form, with an optional due date. */
async function addTask(page: Page, title: string, dueDate?: string) {
  await page.getByLabel("New task").fill(title);
  if (dueDate) await page.getByLabel("Due date").fill(dueDate);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(taskItem(page, title)).toBeVisible();
}

function tasksList(page: Page) {
  return page.getByRole("list", { name: "Tasks" });
}

/** The "Tasks" list item for a task, found by its toggle button. */
function taskItem(page: Page, title: string) {
  return tasksList(page)
    .getByRole("listitem")
    .filter({
      has: page.getByRole("button", {
        name: new RegExp(`^(Mark done|Reopen): ${escapeRegExp(title)}$`),
      }),
    });
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function overdueTag(page: Page, title: string) {
  return taskItem(page, title).getByText("Overdue", { exact: true });
}

/** The path of a task's "Edit task" page, from its "Edit" link. */
async function editPath(page: Page, title: string) {
  const href = await page
    .getByRole("link", { name: `Edit: ${title}`, exact: true })
    .getAttribute("href");
  expect(href).toMatch(/^\/tasks\/\d+\/edit$/);
  return href as string;
}

test("AC1: Adding a task with a due date", async ({ page }) => {
  const projectPath = await newProject(page, "Due dates QA");
  await page.getByLabel("New task").fill("Book the venue");
  await page.getByLabel("Due date").fill("2030-06-15");
  await page.getByRole("button", { name: "Add task" }).click();

  await expect(page).toHaveURL(projectPath);
  const item = taskItem(page, "Book the venue");
  await expect(item).toContainText("Book the venue");
  await expect(item).toContainText("Due 2030-06-15");
});

test("AC2: Adding a task without a due date", async ({ page }) => {
  await newProject(page, "Due dates QA");
  await expect(page.getByLabel("Due date")).toBeVisible();
  await page.getByLabel("New task").fill("Order snacks");
  await page.getByRole("button", { name: "Add task" }).click();

  const item = taskItem(page, "Order snacks");
  await expect(item).toBeVisible();
  await expect(item).not.toContainText("Due");
  await expect(overdueTag(page, "Order snacks")).toHaveCount(0);
});

test("AC3: An invalid due date is refused", async ({ page }) => {
  const projectPath = await newProject(page, "Due dates QA");
  // The form must offer the field before the server's checks matter.
  await expect(page.getByLabel("Due date")).toBeVisible();

  for (const [title, due] of <[string, string][]>[
    ["Bad date", "2030-02-30"],
    ["Bad date 2", "soon"],
    ["Bad date 3", "2030-6-15"],
    ["Bad date 4", "15/06/2030"],
  ]) {
    const response = await page.request.post(`${projectPath}/tasks`, {
      form: { title, due_date: due },
      maxRedirects: 0,
    });
    expect(response.status(), `due_date ${due}`).toBe(400);
  }

  const blank = await page.request.post(`${projectPath}/tasks`, {
    form: { title: "Blank date", due_date: "" },
  });
  expect(blank.ok()).toBe(true);
  const none = await page.request.post(`${projectPath}/tasks`, {
    form: { title: "No date field" },
  });
  expect(none.ok()).toBe(true);

  await page.goto(projectPath);
  for (const title of ["Bad date", "Bad date 2", "Bad date 3", "Bad date 4"]) {
    await expect(taskItem(page, title)).toHaveCount(0);
  }
  for (const title of ["Blank date", "No date field"]) {
    await expect(taskItem(page, title)).toBeVisible();
    await expect(taskItem(page, title)).not.toContainText("Due");
  }
});

test("AC4: Opening a task's edit page", async ({ page }) => {
  const projectPath = await newProject(page, "Due dates QA");
  await addTask(page, "Book the venue", "2030-06-15");

  await page.getByRole("link", { name: "Edit: Book the venue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Book the venue");
  await expect(page.getByLabel("Due date")).toHaveValue("2030-06-15");
  await expect(page.getByRole("button", { name: "Save task" })).toBeVisible();
  const back = page.getByRole("link", { name: "Back to project" });
  await expect(back).toHaveAttribute("href", projectPath);
  await back.click();
  await expect(page).toHaveURL(projectPath);
});

test("AC5: Setting, changing and clearing a due date by editing", async ({ page }) => {
  const projectPath = await newProject(page, "Due dates QA");
  await addTask(page, "Book the venue", "2030-06-15");
  await addTask(page, "Order snacks");

  // Change a due date.
  await page.getByRole("link", { name: "Edit: Book the venue", exact: true }).click();
  await page.getByLabel("Due date").fill("2030-07-01");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page).toHaveURL(projectPath);
  await expect(taskItem(page, "Book the venue")).toContainText("Due 2030-07-01");
  await expect(taskItem(page, "Book the venue")).not.toContainText("2030-06-15");

  // Set a due date on an undated task.
  await page.getByRole("link", { name: "Edit: Order snacks", exact: true }).click();
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await page.getByLabel("Due date").fill("2030-05-05");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page).toHaveURL(projectPath);
  await expect(taskItem(page, "Order snacks")).toContainText("Due 2030-05-05");

  // Clear it again.
  await page.getByRole("link", { name: "Edit: Order snacks", exact: true }).click();
  await page.getByLabel("Due date").fill("");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page).toHaveURL(projectPath);
  await expect(taskItem(page, "Order snacks")).toBeVisible();
  await expect(taskItem(page, "Order snacks")).not.toContainText("Due");

  // Editing the title of a done task keeps it done.
  await page.getByRole("button", { name: "Mark done: Book the venue" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Book the venue" })).toBeVisible();
  await page.getByRole("link", { name: "Edit: Book the venue", exact: true }).click();
  await page.getByLabel("Title").fill("Book the big venue");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page).toHaveURL(projectPath);
  await expect(page.getByRole("button", { name: "Reopen: Book the big venue" })).toBeVisible();
  await expect(taskItem(page, "Book the big venue")).toContainText("Due 2030-07-01");
  await expect(taskItem(page, "Book the venue")).toHaveCount(0);

  // Editing an open task keeps it open.
  await page.getByRole("link", { name: "Edit: Order snacks", exact: true }).click();
  await page.getByLabel("Title").fill("Order more snacks");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByRole("button", { name: "Mark done: Order more snacks" })).toBeVisible();
});

test("AC6: Invalid edits are refused", async ({ page }) => {
  const projectPath = await newProject(page, "Due dates QA");
  await addTask(page, "Book the big venue", "2030-07-01");
  const path = await editPath(page, "Book the big venue");

  // Through the page: an emptied title.
  await page.goto(path);
  await page.getByLabel("Title").evaluate((el) => el.removeAttribute("required"));
  await page.getByLabel("Title").fill("");
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "POST" && new URL(r.url()).pathname === path,
    ),
    page.getByRole("button", { name: "Save task" }).click(),
  ]);
  expect(response.status()).toBe(400);
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(EDIT_ERROR);

  // Straight requests: whitespace title, long title, invalid due dates.
  for (const form of [
    { title: "   ", due_date: "2030-07-01" },
    { title: "x".repeat(201), due_date: "2030-07-01" },
    { title: "Renamed", due_date: "2030-02-30" },
    { title: "Renamed", due_date: "soon" },
  ]) {
    const res = await page.request.post(path, { form, maxRedirects: 0 });
    expect(res.status(), JSON.stringify(form).slice(0, 80)).toBe(400);
    const body = await res.text();
    expect(body).toContain("Edit task");
    expect(body).toContain(EDIT_ERROR);
  }

  // The task is unchanged.
  await page.goto(projectPath);
  await expect(taskItem(page, "Book the big venue")).toContainText("Due 2030-07-01");
  await expect(page.getByRole("button", { name: "Mark done: Book the big venue" })).toBeVisible();
  await expect(taskItem(page, "Renamed")).toHaveCount(0);

  // A task that doesn't exist.
  expect((await page.request.get("/tasks/999999999/edit")).status()).toBe(404);
  const missing = await page.request.post("/tasks/999999999/edit", {
    form: { title: "Ghost", due_date: "" },
    maxRedirects: 0,
  });
  expect(missing.status()).toBe(404);
});

test("AC7: Overdue open tasks are marked", async ({ page }) => {
  await newProject(page, "Due dates QA");
  const yesterday = utcDate(-1);
  const today = utcDate(0);
  await addTask(page, "Pay invoice", yesterday);
  await addTask(page, "Long overdue", "2020-01-01");
  await addTask(page, "Due today", today);
  await addTask(page, "Due later", "2030-12-31");
  await addTask(page, "Order snacks");

  await expect(taskItem(page, "Pay invoice")).toContainText(`Due ${yesterday}`);
  await expect(overdueTag(page, "Pay invoice")).toBeVisible();
  await expect(taskItem(page, "Long overdue")).toContainText("Due 2020-01-01");
  await expect(overdueTag(page, "Long overdue")).toBeVisible();

  await expect(taskItem(page, "Due today")).toContainText(`Due ${today}`);
  await expect(overdueTag(page, "Due today")).toHaveCount(0);
  await expect(taskItem(page, "Due later")).toContainText("Due 2030-12-31");
  await expect(overdueTag(page, "Due later")).toHaveCount(0);
  await expect(overdueTag(page, "Order snacks")).toHaveCount(0);
});

test("AC8: Done tasks are not marked overdue", async ({ page }) => {
  await newProject(page, "Due dates QA");
  const yesterday = utcDate(-1);
  await addTask(page, "Pay invoice", yesterday);
  await expect(overdueTag(page, "Pay invoice")).toBeVisible();

  await page.getByRole("button", { name: "Mark done: Pay invoice" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Pay invoice" })).toBeVisible();
  await expect(taskItem(page, "Pay invoice")).toContainText(`Due ${yesterday}`);
  await expect(overdueTag(page, "Pay invoice")).toHaveCount(0);

  await page.getByRole("button", { name: "Reopen: Pay invoice" }).click();
  await expect(page.getByRole("button", { name: "Mark done: Pay invoice" })).toBeVisible();
  await expect(overdueTag(page, "Pay invoice")).toBeVisible();
});

async function expectOrder(page: Page, titles: string[]) {
  const items = tasksList(page).getByRole("listitem");
  await expect(items).toHaveCount(titles.length);
  for (const [i, title] of titles.entries()) {
    await expect(
      items.nth(i).getByRole("button", {
        name: new RegExp(`^(Mark done|Reopen): ${escapeRegExp(title)}$`),
      }),
      `position ${i + 1} should be "${title}"`,
    ).toBeVisible();
  }
}

test("AC9: Earliest due date first, undated tasks last", async ({ page }) => {
  await newProject(page, "Order QA");
  await addTask(page, "No date A");
  await addTask(page, "Late", "2030-03-01");
  await addTask(page, "Early", "2030-01-01");
  await addTask(page, "No date B");
  await addTask(page, "Also early", "2030-01-01");

  await expectOrder(page, ["Early", "Also early", "Late", "No date A", "No date B"]);

  await page.getByRole("button", { name: "Mark done: Early" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Early" })).toBeVisible();
  await expectOrder(page, ["Early", "Also early", "Late", "No date A", "No date B"]);

  await page.getByRole("button", { name: "Mark done: No date A" }).click();
  await expect(page.getByRole("button", { name: "Reopen: No date A" })).toBeVisible();
  await expectOrder(page, ["Early", "Also early", "Late", "No date A", "No date B"]);
});

test("AC10: Existing tasks have no due date", async ({ page }) => {
  const projectPath = await newProject(page, "Existing QA");
  // Tasks added as the app adds them today, with no due date field at all.
  for (const title of ["Old one", "Old two", "Old three"]) {
    const res = await page.request.post(`${projectPath}/tasks`, { form: { title } });
    expect(res.ok()).toBe(true);
  }
  await page.goto(projectPath);
  for (const title of ["Old one", "Old two", "Old three"]) {
    await expect(taskItem(page, title)).not.toContainText("Due");
    await expect(overdueTag(page, title)).toHaveCount(0);
  }

  // A task given a date afterwards moves above them.
  await page.getByRole("link", { name: "Edit: Old three", exact: true }).click();
  await page.getByLabel("Due date").fill("2030-01-01");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page).toHaveURL(projectPath);
  await expectOrder(page, ["Old three", "Old one", "Old two"]);
});
