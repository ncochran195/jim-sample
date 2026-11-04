import { expect, type Page, test } from "../../.github/jim/playwright.js";

// Task due dates: set when adding, changed or removed on the "Edit task" page,
// shown as "Due <date>" with an "Overdue" tag, and the list sorted by due date.

const ERROR_COLOUR = "rgb(176, 0, 32)"; // .error in src/web/layout.ts, #b00020

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function signUp(page: Page) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`user-${unique()}@example.com`);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
}

/** Signs up and creates a project, leaving the browser on its page. */
async function newProject(page: Page, prefix: string) {
  await signUp(page);
  const name = `${prefix} ${unique()}`;
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  return name;
}

function tasksList(page: Page) {
  return page.getByRole("list", { name: "Tasks" });
}

/** The list item for the task titled exactly `title`. */
function taskItem(page: Page, title: string) {
  return tasksList(page)
    .getByRole("listitem")
    .filter({ has: page.getByText(title, { exact: true }) });
}

async function fillDueDate(page: Page, value: string) {
  const field = page.getByLabel("Due date");
  await expect(field).toBeVisible();
  await field.fill(value);
}

async function addTask(page: Page, title: string, dueDate?: string) {
  await page.getByLabel("New task").fill(title);
  if (dueDate !== undefined) await fillDueDate(page, dueDate);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(taskItem(page, title)).toBeVisible();
}

async function openEdit(page: Page, title: string) {
  const edit = page.getByRole("button", { name: `Edit: ${title}` });
  await expect(edit).toBeVisible();
  await edit.click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
}

async function expectBackOnProject(page: Page, project: string) {
  await expect(page.getByRole("heading", { name: project })).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/\d+$/);
}

test("AC1: Adding a task with a due date", async ({ page }) => {
  const project = await newProject(page, "Due dates QA");
  await page.getByLabel("New task").fill("Book the venue");
  await fillDueDate(page, "2099-03-01");
  await page.getByRole("button", { name: "Add task" }).click();

  await expectBackOnProject(page, project);
  const item = taskItem(page, "Book the venue");
  await expect(item).toContainText("Due 2099-03-01");
  await expect(item.getByText("Overdue", { exact: true })).toHaveCount(0);
});

test("AC2: Adding a task without a due date", async ({ page }) => {
  await newProject(page, "Due dates QA");
  await expect(page.getByLabel("Due date")).toBeVisible();
  await page.getByLabel("New task").fill("Order snacks");
  await page.getByRole("button", { name: "Add task" }).click();

  const item = taskItem(page, "Order snacks");
  await expect(item).toBeVisible();
  await expect(item).not.toContainText("Due");
  await expect(item.getByText("Overdue", { exact: true })).toHaveCount(0);
});

test("AC3: Giving an existing task a due date", async ({ page }) => {
  const project = await newProject(page, "Due dates QA");
  await addTask(page, "Order snacks");
  await expect(taskItem(page, "Order snacks")).not.toContainText("Due");

  await openEdit(page, "Order snacks");
  await fillDueDate(page, "2099-05-20");
  await page.getByRole("button", { name: "Save" }).click();

  await expectBackOnProject(page, project);
  await expect(taskItem(page, "Order snacks")).toContainText("Due 2099-05-20");
});

test("AC4: Changing and removing a task's due date", async ({ page }) => {
  const project = await newProject(page, "Due dates QA");
  await addTask(page, "Book the venue", "2099-03-01");

  await openEdit(page, "Book the venue");
  await expect(page.getByLabel("Title")).toHaveValue("Book the venue");
  await expect(page.getByLabel("Due date")).toHaveValue("2099-03-01");

  await fillDueDate(page, "2099-04-10");
  await page.getByRole("button", { name: "Save" }).click();
  await expectBackOnProject(page, project);
  await expect(taskItem(page, "Book the venue")).toContainText("Due 2099-04-10");

  await openEdit(page, "Book the venue");
  await expect(page.getByLabel("Due date")).toHaveValue("2099-04-10");
  await fillDueDate(page, "");
  await page.getByRole("button", { name: "Save" }).click();
  await expectBackOnProject(page, project);
  const item = taskItem(page, "Book the venue");
  await expect(item).toBeVisible();
  await expect(item).not.toContainText("Due");
  await expect(item.getByText("Overdue", { exact: true })).toHaveCount(0);
});

test("AC5: Open tasks past their due date are marked overdue", async ({ page }) => {
  await newProject(page, "Due dates QA");
  await addTask(page, "Renew the domain", "2020-01-15");

  const item = taskItem(page, "Renew the domain");
  await expect(item).toContainText("Due 2020-01-15");
  const tag = item.getByText("Overdue", { exact: true });
  await expect(tag).toBeVisible();
  await expect(tag).toHaveCSS("color", ERROR_COLOUR);
});

test("AC6: Tasks due today or later, and done tasks, are not overdue", async ({ page }) => {
  await newProject(page, "Due dates QA");
  const today = new Date().toISOString().slice(0, 10);
  await addTask(page, "Due today", today);
  await addTask(page, "Order snacks", "2099-03-01");
  await addTask(page, "Renew the domain", "2020-01-15");

  await expect(taskItem(page, "Due today")).toContainText(`Due ${today}`);
  await expect(
    taskItem(page, "Renew the domain").getByText("Overdue", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Mark done: Renew the domain" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Renew the domain" })).toBeVisible();
  await expect(taskItem(page, "Renew the domain")).toContainText("Due 2020-01-15");
  await expect(tasksList(page).getByText("Overdue", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Reopen: Renew the domain" }).click();
  await expect(page.getByRole("button", { name: "Mark done: Renew the domain" })).toBeVisible();
  await expect(
    taskItem(page, "Renew the domain").getByText("Overdue", { exact: true }),
  ).toBeVisible();
  await expect(taskItem(page, "Due today").getByText("Overdue", { exact: true })).toHaveCount(0);
  await expect(taskItem(page, "Order snacks").getByText("Overdue", { exact: true })).toHaveCount(0);
});

test("AC7: Tasks are ordered by due date, undated last", async ({ page }) => {
  await newProject(page, "Ordering QA");
  await addTask(page, "No date A");
  await addTask(page, "Later", "2099-06-01");
  await addTask(page, "Sooner", "2099-02-01");
  await addTask(page, "No date B");
  await addTask(page, "Long ago", "2020-01-15");

  const items = tasksList(page).getByRole("listitem");
  await expect(items).toHaveText([/Long ago/, /Sooner/, /Later/, /No date A/, /No date B/]);

  // Done tasks are sorted by the same rule as open ones.
  await page.getByRole("button", { name: "Mark done: Sooner" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Sooner" })).toBeVisible();
  await expect(items).toHaveText([/Long ago/, /Sooner/, /Later/, /No date A/, /No date B/]);

  await openEdit(page, "No date B");
  await fillDueDate(page, "2099-01-01");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(items).toHaveText([/Long ago/, /No date B/, /Sooner/, /Later/, /No date A/]);

  // Tasks with the same due date keep the order they were added in.
  await addTask(page, "Also sooner", "2099-02-01");
  await expect(items).toHaveText([
    /Long ago/,
    /No date B/,
    /Sooner/,
    /Also sooner/,
    /Later/,
    /No date A/,
  ]);
});

test("AC8: Tasks from before the change have no due date", async ({ page }) => {
  // The in-memory app has no seeded demo data, so this builds "Team handbook"
  // the way the app did before the change: posting a title and nothing else.
  await signUp(page);
  const name = `Team handbook ${unique()}`;
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  const projectPath = new URL(page.url()).pathname;
  for (const title of [
    "Write the welcome page",
    "List the tools we use",
    "Agree on a review rota",
  ]) {
    const response = await page.request.post(`${projectPath}/tasks`, { form: { title } });
    expect(response.ok()).toBe(true);
  }
  await page.goto(projectPath);
  await page.getByRole("button", { name: "Mark done: Agree on a review rota" }).click();

  await page.goto("/projects");
  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  const items = tasksList(page).getByRole("listitem");
  await expect(items).toHaveText([
    /Write the welcome page/,
    /List the tools we use/,
    /Agree on a review rota/,
  ]);
  await expect(tasksList(page)).not.toContainText("Due");
  await expect(tasksList(page).getByText("Overdue", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reopen: Agree on a review rota" })).toBeVisible();
  await expect(tasksList(page).getByText("Agree on a review rota", { exact: true })).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  for (const title of [
    "Write the welcome page",
    "List the tools we use",
    "Agree on a review rota",
  ]) {
    await expect(page.getByRole("button", { name: `Edit: ${title}` })).toBeVisible();
  }
});

test("AC9: Editing a task that doesn't exist", async ({ page }) => {
  await newProject(page, "Due dates QA");
  await addTask(page, "Book the venue");

  // An existing task's edit page answers, so the 404 below is about the task.
  const action = await page.locator('form[action$="/toggle"]').first().getAttribute("action");
  const editPath = action?.replace(/\/toggle$/, "/edit") ?? "";
  expect(editPath).toMatch(/^\/tasks\/\d+\/edit$/);
  await page.goto(editPath);
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();

  const response = await page.goto("/tasks/999999999/edit");
  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).toHaveText("404 Not Found");
});

test("AC10: Changing a task's title", async ({ page }) => {
  const project = await newProject(page, "Due dates QA");
  await addTask(page, "First task", "2099-01-01");
  await addTask(page, "Order snacks", "2099-05-20");
  await addTask(page, "Last task", "2099-12-31");
  const items = tasksList(page).getByRole("listitem");
  await expect(items).toHaveText([/First task/, /Order snacks/, /Last task/]);

  await openEdit(page, "Order snacks");
  await page.getByLabel("Title").fill("Order snacks and drinks");
  await page.getByRole("button", { name: "Save" }).click();

  await expectBackOnProject(page, project);
  await expect(taskItem(page, "Order snacks and drinks")).toContainText("Due 2099-05-20");
  await expect(tasksList(page).getByText("Order snacks", { exact: true })).toHaveCount(0);
  await expect(items).toHaveText([/First task/, /Order snacks and drinks/, /Last task/]);

  // Titles that are empty, only spaces, or over 200 characters are refused.
  for (const bad of ["", "   ", "x".repeat(201)]) {
    await openEdit(page, "Order snacks and drinks");
    const title = page.getByLabel("Title");
    await title.evaluate((el) => {
      el.removeAttribute("required");
      el.removeAttribute("maxlength");
      el.removeAttribute("minlength");
      el.removeAttribute("pattern");
    });
    await title.fill(bad);
    await page.getByRole("button", { name: "Save" }).click();

    await expectBackOnProject(page, project);
    await expect(taskItem(page, "Order snacks and drinks")).toContainText("Due 2099-05-20");
    await expect(items).toHaveText([/First task/, /Order snacks and drinks/, /Last task/]);
  }
});
