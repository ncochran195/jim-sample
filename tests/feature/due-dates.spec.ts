import { expect, type Locator, type Page, test } from "../../.github/jim/playwright.js";

// Task due dates: setting, editing and clearing them, the "Overdue" tag, and
// the task list's order by due date.

const TITLE_ERROR = "Give the task a title of 1 to 200 characters.";
const DATE_ERROR = "Give the due date as a real date, or leave it empty.";

function uniqueEmail() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function isoDate(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

async function signUp(page: Page) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
}

/** Signs up and creates a project, leaving the browser on its page. Returns the project's path. */
async function newProject(page: Page, name: string) {
  await signUp(page);
  const project = `${name} ${Date.now()}`;
  await page.getByLabel("New project name").fill(project);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: project })).toBeVisible();
  return { name: project, path: new URL(page.url()).pathname };
}

async function addTask(page: Page, title: string, due?: string) {
  await page.getByLabel("New task").fill(title);
  if (due !== undefined) await page.getByLabel("Due date").fill(due);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(taskRow(page, title)).toBeVisible();
}

function tasksList(page: Page) {
  return page.getByRole("list", { name: "Tasks" });
}

/** The task's item in the "Tasks" list, matching its title exactly. */
function taskRow(page: Page, title: string): Locator {
  return tasksList(page)
    .getByRole("listitem")
    .filter({ has: page.getByText(title, { exact: true }) });
}

async function openEdit(page: Page, title: string) {
  await page.getByRole("link", { name: `Edit: ${title}` }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
}

async function expectNoDue(row: Locator) {
  await expect(row).toBeVisible();
  await expect(row).not.toContainText("Due");
  await expect(row.getByText("Overdue", { exact: true })).toHaveCount(0);
}

async function expectRed(tag: Locator) {
  const colours = await tag.evaluate((el) => {
    const style = getComputedStyle(el);
    return [style.color, style.backgroundColor];
  });
  const red = colours.some((colour) => {
    const [r = 0, g = 0, b = 0, a = 1] = (colour.match(/[\d.]+/g) ?? []).map(Number);
    return a > 0 && r >= 150 && g <= 100 && b <= 100;
  });
  expect(red, `expected the "Overdue" tag to be red, got ${colours.join(" / ")}`).toBe(true);
}

/** Lets a form field accept anything, as a person with developer tools could. */
async function loosen(field: Locator) {
  await field.evaluate((el) => {
    const input = el as HTMLInputElement;
    input.removeAttribute("required");
    input.removeAttribute("maxlength");
    input.removeAttribute("pattern");
    input.type = "text";
  });
}

function postResponse(page: Page, pathEnd: RegExp) {
  return page.waitForResponse(
    (r) => r.request().method() === "POST" && pathEnd.test(new URL(r.url()).pathname),
  );
}

test("AC1: Adding a task with a due date", async ({ page }) => {
  const project = await newProject(page, "Due dates QA");
  await page.getByLabel("New task").fill("Book the venue");
  await page.getByLabel("Due date").fill("2099-03-15");
  await page.getByRole("button", { name: "Add task" }).click();

  await expect(page.getByRole("heading", { name: project.name })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(project.path);
  const row = taskRow(page, "Book the venue");
  await expect(row).toContainText("Due 2099-03-15");
  await expect(row.getByText("Overdue", { exact: true })).toHaveCount(0);
});

test("AC2: Adding a task without a due date", async ({ page }) => {
  await newProject(page, "Due dates QA");
  await expect(page.getByLabel("Due date")).toBeVisible();
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await page.getByLabel("New task").fill("Order snacks");
  await page.getByRole("button", { name: "Add task" }).click();

  await expectNoDue(taskRow(page, "Order snacks"));
});

test("AC3: Editing a task's due date", async ({ page }) => {
  const project = await newProject(page, "Due dates QA");
  await addTask(page, "Book the venue", "2099-03-15");

  await openEdit(page, "Book the venue");
  await expect(page.getByLabel("Title")).toHaveValue("Book the venue");
  await expect(page.getByLabel("Due date")).toHaveValue("2099-03-15");
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  const back = page.locator(`main a[href$="${project.path}"]`);
  await expect(back).toHaveCount(1);

  await page.getByLabel("Due date").fill("2099-04-01");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: project.name })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(project.path);
  const row = taskRow(page, "Book the venue");
  await expect(row).toContainText("Due 2099-04-01");
  await expect(row).not.toContainText("2099-03-15");

  // The link back to the project goes there without saving.
  await openEdit(page, "Book the venue");
  await page.locator(`main a[href$="${project.path}"]`).click();
  await expect(page.getByRole("heading", { name: project.name })).toBeVisible();
});

test("AC4: Giving a due date to a task that has none, and clearing one", async ({ page }) => {
  await newProject(page, "Due dates QA");
  await addTask(page, "Order snacks");
  await expectNoDue(taskRow(page, "Order snacks"));

  await openEdit(page, "Order snacks");
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await page.getByLabel("Due date").fill("2099-05-05");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(taskRow(page, "Order snacks")).toContainText("Due 2099-05-05");

  await openEdit(page, "Order snacks");
  await expect(page.getByLabel("Due date")).toHaveValue("2099-05-05");
  await page.getByLabel("Due date").fill("");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(tasksList(page)).toBeVisible();
  await expectNoDue(taskRow(page, "Order snacks"));
});

test("AC5: Editing a task's title", async ({ page }) => {
  const project = await newProject(page, "Due dates QA");
  await addTask(page, "Order snacks");
  await addTask(page, "Book the venue", "2099-03-15");

  // An undated task stays undated.
  await openEdit(page, "Order snacks");
  await page.getByLabel("Title").fill("Order snacks and drinks");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: project.name })).toBeVisible();
  await expectNoDue(taskRow(page, "Order snacks and drinks"));
  await expect(taskRow(page, "Order snacks")).toHaveCount(0);

  // A dated task keeps its date.
  await openEdit(page, "Book the venue");
  await page.getByLabel("Title").fill("Book the hall");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(taskRow(page, "Book the hall")).toContainText("Due 2099-03-15");
  await expect(taskRow(page, "Book the venue")).toHaveCount(0);

  // An empty title, or one over 200 characters, is refused.
  for (const title of ["", "x".repeat(201)]) {
    await page.goto(project.path);
    await openEdit(page, "Book the hall");
    await loosen(page.getByLabel("Title"));
    await page.getByLabel("Title").fill(title);
    const response = postResponse(page, /\/edit$/);
    await page.getByRole("button", { name: "Save" }).click();
    expect((await response).status()).toBe(400);
    await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
    await expect(page.getByText(TITLE_ERROR)).toBeVisible();

    await page.goto(project.path);
    await expect(taskRow(page, "Book the hall")).toContainText("Due 2099-03-15");
    await expect(tasksList(page).getByRole("listitem")).toHaveCount(2);
  }
});

test("AC6: An invalid due date is refused", async ({ page }) => {
  const project = await newProject(page, "Due dates QA");
  await addTask(page, "Book the venue", "2099-04-01");

  // Adding a task with an invalid due date.
  for (const due of ["2026-02-30", "soon"]) {
    await page.goto(project.path);
    await loosen(page.getByLabel("Due date"));
    await page.getByLabel("New task").fill("Bad date");
    await page.getByLabel("Due date").fill(due);
    const response = postResponse(page, /\/tasks$/);
    await page.getByRole("button", { name: "Add task" }).click();
    expect((await response).status()).toBe(400);
    await expect(page.getByRole("heading", { name: project.name })).toBeVisible();
    await expect(page.getByText(DATE_ERROR)).toBeVisible();

    await page.goto(project.path);
    await expect(taskRow(page, "Bad date")).toHaveCount(0);
    await expect(tasksList(page).getByRole("listitem")).toHaveCount(1);
  }

  // Saving a task with an invalid due date.
  for (const due of ["soon", "2026-02-30"]) {
    await page.goto(project.path);
    await openEdit(page, "Book the venue");
    await loosen(page.getByLabel("Due date"));
    await page.getByLabel("Title").fill("Book the hall");
    await page.getByLabel("Due date").fill(due);
    const response = postResponse(page, /\/edit$/);
    await page.getByRole("button", { name: "Save" }).click();
    expect((await response).status()).toBe(400);
    await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
    await expect(page.getByText(DATE_ERROR)).toBeVisible();

    await page.goto(project.path);
    await expect(taskRow(page, "Book the venue")).toContainText("Due 2099-04-01");
    await expect(taskRow(page, "Book the hall")).toHaveCount(0);
  }
});

test("AC7: Editing a task that doesn't exist", async ({ page }) => {
  await newProject(page, "Due dates QA");
  await addTask(page, "Book the venue");

  // A real task's edit page is there, so the 404s below are for the missing task.
  await openEdit(page, "Book the venue");
  const realEdit = new URL(page.url()).pathname;
  expect(realEdit).toMatch(/^\/tasks\/\d+\/edit$/);

  const opened = await page.goto("/tasks/999999999/edit");
  expect(opened?.status()).toBe(404);

  const posted = await page.request.post("/tasks/999999999/edit", {
    form: { title: "Ghost", due: "2099-01-01" },
    maxRedirects: 0,
  });
  expect(posted.status()).toBe(404);
});

test("AC8: Open tasks past their due date are marked overdue", async ({ page }) => {
  await newProject(page, "Overdue QA");
  const today = isoDate();
  const tomorrow = isoDate(1);
  await addTask(page, "File the report", "2020-01-15");
  await addTask(page, "Due today", today);
  await addTask(page, "Due tomorrow", tomorrow);

  const late = taskRow(page, "File the report");
  await expect(late).toContainText("Due 2020-01-15");
  const tag = late.getByText("Overdue", { exact: true });
  await expect(tag).toBeVisible();
  await expectRed(tag);

  const dueToday = taskRow(page, "Due today");
  await expect(dueToday).toContainText(`Due ${today}`);
  await expect(dueToday.getByText("Overdue", { exact: true })).toHaveCount(0);

  const dueTomorrow = taskRow(page, "Due tomorrow");
  await expect(dueTomorrow).toContainText(`Due ${tomorrow}`);
  await expect(dueTomorrow.getByText("Overdue", { exact: true })).toHaveCount(0);
});

test("AC9: Done tasks are never overdue", async ({ page }) => {
  await newProject(page, "Overdue QA");
  await addTask(page, "File the report", "2020-01-15");
  const row = taskRow(page, "File the report");
  await expect(row.getByText("Overdue", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mark done: File the report" }).click();
  await expect(page.getByRole("button", { name: "Reopen: File the report" })).toBeVisible();
  await expect(row).toContainText("Due 2020-01-15");
  await expect(row.getByText("Overdue", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Reopen: File the report" }).click();
  await expect(page.getByRole("button", { name: "Mark done: File the report" })).toBeVisible();
  await expect(row).toContainText("Due 2020-01-15");
  await expect(row.getByText("Overdue", { exact: true })).toBeVisible();
});

test("AC10: The task list puts the earliest due dates first", async ({ page }) => {
  await newProject(page, "Order QA");
  await addTask(page, "C later", "2099-06-01");
  await addTask(page, "B no date");
  await addTask(page, "A sooner", "2099-01-10");
  await addTask(page, "D earliest", "2020-01-15");
  await addTask(page, "E also no date");
  await addTask(page, "F same day as C", "2099-06-01");

  const expected = [
    "D earliest",
    "A sooner",
    "C later",
    "F same day as C",
    "B no date",
    "E also no date",
  ];
  const items = tasksList(page).getByRole("listitem");
  async function expectOrder() {
    await expect(items).toHaveCount(expected.length);
    for (const [i, title] of expected.entries()) {
      await expect(items.nth(i)).toContainText(title);
    }
  }
  await expectOrder();

  // Done or not, a task keeps its place.
  await page.getByRole("button", { name: "Mark done: A sooner" }).click();
  await expect(page.getByRole("button", { name: "Reopen: A sooner" })).toBeVisible();
  await expectOrder();
  await page.getByRole("button", { name: "Mark done: B no date" }).click();
  await expect(page.getByRole("button", { name: "Reopen: B no date" })).toBeVisible();
  await expectOrder();
  await page.getByRole("button", { name: "Mark done: C later" }).click();
  await expect(page.getByRole("button", { name: "Reopen: C later" })).toBeVisible();
  await expectOrder();
});

test("AC11: Existing tasks have no due date", async ({ page }) => {
  // The feature suite's database starts empty, so tasks added with only a
  // title, as they were before this change, stand in for existing ones.
  await newProject(page, "Team handbook");
  for (const title of [
    "Write the welcome page",
    "List the tools we use",
    "Agree on a review rota",
  ]) {
    await page.getByLabel("New task").fill(title);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(taskRow(page, title)).toBeVisible();
  }
  await page.getByRole("button", { name: "Mark done: Agree on a review rota" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Agree on a review rota" })).toBeVisible();

  // A dated task, added after them, goes above them, and they keep their order.
  await addTask(page, "Dated later", "2099-01-01");
  const items = tasksList(page).getByRole("listitem");
  const expected = [
    "Dated later",
    "Write the welcome page",
    "List the tools we use",
    "Agree on a review rota",
  ];
  await expect(items).toHaveCount(expected.length);
  for (const [i, title] of expected.entries()) {
    await expect(items.nth(i)).toContainText(title);
  }
  for (const title of expected.slice(1)) {
    await expectNoDue(taskRow(page, title));
  }
});
