import { expect, type Page, test } from "../../.github/jim/playwright.js";

// Task due dates: setting, editing and removing a due date, the "Overdue" tag,
// ordering by due date, and the "N overdue" count above the task list.

function uniqueEmail() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** A UTC calendar date, `offset` days from today, as YYYY-MM-DD. */
function utcDate(offset: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function signUp(page: Page) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
}

/** Creates a project and returns its page's URL. */
async function createProject(page: Page, name: string) {
  await page.goto("/projects");
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  return page.url();
}

async function addTask(page: Page, title: string, dueDate?: string) {
  await page.getByLabel("New task").fill(title);
  if (dueDate) {
    await expect(page.getByLabel("Due date")).toBeVisible();
    await page.getByLabel("Due date").fill(dueDate);
  }
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(taskList(page).getByText(title)).toBeVisible();
}

function taskList(page: Page) {
  return page.getByRole("list", { name: "Tasks" });
}

function taskRow(page: Page, title: string) {
  return taskList(page)
    .getByRole("listitem")
    .filter({ hasText: new RegExp(escapeRegExp(title)) });
}

function overdueLine(page: Page) {
  return page.getByText(/^\s*\d+ overdue\s*$/);
}

async function expectNoDueDate(page: Page, title: string) {
  const row = taskRow(page, title);
  await expect(row).toHaveCount(1);
  await expect(row).not.toContainText(/Due \d{4}-\d{2}-\d{2}/);
  await expect(row).not.toContainText("Overdue");
}

async function expectDueDate(page: Page, title: string, date: string) {
  await expect(taskRow(page, title)).toContainText(`Due ${date}`);
}

async function editAndSave(page: Page, title: string, dueDate: string) {
  await page.getByRole("link", { name: `Edit: ${title}` }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await page.getByLabel("Due date").fill(dueDate);
  await page.getByRole("button", { name: "Save" }).click();
}

test("AC1: Adding a task with a due date", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Due dates AC1");
  await addTask(page, "Book the venue", "2030-01-15");

  await expectDueDate(page, "Book the venue", "2030-01-15");
  await expect(taskRow(page, "Book the venue")).not.toContainText("Overdue");
});

test("AC2: Adding a task without a due date", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Due dates AC1");
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await addTask(page, "Order snacks");

  await expectNoDueDate(page, "Order snacks");
});

test("AC3: Setting a due date on an existing task", async ({ page }) => {
  await signUp(page);
  const projectUrl = await createProject(page, "Due dates AC1");
  await addTask(page, "Order snacks");

  await expect(page.getByRole("link", { name: "Edit: Order snacks" })).toBeVisible();
  await page.getByRole("link", { name: "Edit: Order snacks" }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await expect(page.getByText("Order snacks")).toBeVisible();
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Due dates AC1/ })).toBeVisible();

  await page.getByLabel("Due date").fill("2030-02-01");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { name: "Due dates AC1" })).toBeVisible();
  expect(page.url()).toBe(projectUrl);
  await expectDueDate(page, "Order snacks", "2030-02-01");
});

test("AC4: Changing and removing a task's due date", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Due dates AC1");
  await addTask(page, "Book the venue", "2030-01-15");

  await page.getByRole("link", { name: "Edit: Book the venue" }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await expect(page.getByLabel("Due date")).toHaveValue("2030-01-15");
  await page.getByLabel("Due date").fill("2030-03-01");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { name: "Due dates AC1" })).toBeVisible();
  await expectDueDate(page, "Book the venue", "2030-03-01");
  await expect(taskRow(page, "Book the venue")).not.toContainText("Due 2030-01-15");

  await editAndSave(page, "Book the venue", "");
  await expect(page.getByRole("heading", { name: "Due dates AC1" })).toBeVisible();
  await expectNoDueDate(page, "Book the venue");
});

test("AC5: Overdue open tasks are marked", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Due dates AC5");
  await addTask(page, "Send the invoice", utcDate(-1));
  await addTask(page, "Due today", utcDate(0));
  await addTask(page, "Due tomorrow", utcDate(1));
  await addTask(page, "No date");

  const invoice = taskRow(page, "Send the invoice");
  await expect(invoice).toContainText(`Due ${utcDate(-1)}`);
  await expect(invoice).toContainText("Overdue");

  await expect(taskRow(page, "Due today")).toContainText(`Due ${utcDate(0)}`);
  await expect(taskRow(page, "Due today")).not.toContainText("Overdue");
  await expect(taskRow(page, "Due tomorrow")).toContainText(`Due ${utcDate(1)}`);
  await expect(taskRow(page, "Due tomorrow")).not.toContainText("Overdue");
  await expectNoDueDate(page, "No date");
});

test("AC6: Done tasks are not overdue", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Due dates AC5");
  await addTask(page, "Send the invoice", utcDate(-1));
  const invoice = taskRow(page, "Send the invoice");
  await expect(invoice).toContainText("Overdue");

  await page.getByRole("button", { name: "Mark done: Send the invoice" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Send the invoice" })).toBeVisible();
  await expect(invoice.getByText("Send the invoice", { exact: true })).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  await expect(invoice).toContainText(`Due ${utcDate(-1)}`);
  await expect(invoice).not.toContainText("Overdue");

  await page.getByRole("button", { name: "Reopen: Send the invoice" }).click();
  await expect(page.getByRole("button", { name: "Mark done: Send the invoice" })).toBeVisible();
  await expect(invoice).toContainText("Overdue");
});

test("AC7: Earliest due dates first, undated tasks last", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Due dates AC7");
  await addTask(page, "No date task");
  await addTask(page, "Later task", "2030-01-15");
  await addTask(page, "Sooner task", "2030-01-10");
  await addTask(page, "Also later", "2030-01-15");

  const order = [/Sooner task/, /Later task/, /Also later/, /No date task/];
  await expect(taskList(page).getByRole("listitem")).toHaveText(order);

  await page.getByRole("button", { name: "Mark done: Later task" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Later task" })).toBeVisible();
  await expect(taskList(page).getByRole("listitem")).toHaveText(order);
});

test("AC7: Undated tasks keep the order they were added in, whether done or not", async ({
  page,
}) => {
  await signUp(page);
  await createProject(page, "Due dates AC7 undated");
  await addTask(page, "First undated");
  await addTask(page, "Dated task", "2030-01-15");
  await addTask(page, "Second undated");

  await page.getByRole("button", { name: "Mark done: First undated" }).click();
  await expect(page.getByRole("button", { name: "Reopen: First undated" })).toBeVisible();
  await expect(taskList(page).getByRole("listitem")).toHaveText([
    /Dated task/,
    /First undated/,
    /Second undated/,
  ]);
});

test("AC8: Existing tasks have no due date", async ({ page }) => {
  // The feature app starts with an empty database, so the "Team handbook" demo
  // project is rebuilt here: tasks added with no due date, as existing ones are.
  await signUp(page);
  const projectUrl = await createProject(page, "Team handbook");
  await addTask(page, "Write the welcome page");
  await addTask(page, "List the tools we use");
  await addTask(page, "Agree on a review rota");
  await page.getByRole("button", { name: "Mark done: Agree on a review rota" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Agree on a review rota" })).toBeVisible();

  const titles = ["Write the welcome page", "List the tools we use", "Agree on a review rota"];
  await expect(taskList(page).getByRole("listitem")).toHaveText(
    titles.map((t) => new RegExp(escapeRegExp(t))),
  );
  for (const title of titles) {
    await expectNoDueDate(page, title);
    await expect(page.getByRole("link", { name: `Edit: ${title}` })).toBeVisible();
  }

  await page.getByRole("link", { name: "Edit: Write the welcome page" }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await page.getByRole("link", { name: /Team handbook/ }).click();

  await expect(page.getByRole("heading", { name: "Team handbook" })).toBeVisible();
  expect(page.url()).toBe(projectUrl);
  await expect(taskList(page).getByRole("listitem")).toHaveText(
    titles.map((t) => new RegExp(escapeRegExp(t))),
  );
  for (const title of titles) await expectNoDueDate(page, title);
});

test("AC9: Overdue count at the top of the task list", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Due dates AC9");
  await addTask(page, "First late", utcDate(-1));
  await addTask(page, "Second late", utcDate(-2));
  await addTask(page, "Not late", utcDate(1));
  await page.reload();

  const line = overdueLine(page);
  await expect(line).toHaveCount(1);
  await expect(line).toHaveText("2 overdue");

  const lineBox = await line.boundingBox();
  const listBox = await taskList(page).boundingBox();
  const addBox = await page.getByRole("button", { name: "Add task" }).boundingBox();
  if (!lineBox || !listBox || !addBox)
    throw new Error("expected the line, list and form on screen");
  expect(lineBox.y).toBeGreaterThan(addBox.y + addBox.height - 1);
  expect(lineBox.y + lineBox.height).toBeLessThanOrEqual(listBox.y + 1);

  await page.getByRole("button", { name: "Mark done: First late" }).click();
  await expect(page.getByRole("button", { name: "Reopen: First late" })).toBeVisible();
  await expect(overdueLine(page)).toHaveText("1 overdue");

  await page.getByRole("button", { name: "Reopen: First late" }).click();
  await expect(page.getByRole("button", { name: "Mark done: First late" })).toBeVisible();
  await expect(overdueLine(page)).toHaveText("2 overdue");
});

test("AC10: No overdue count when nothing is overdue", async ({ page }) => {
  await signUp(page);

  // Overdue tasks that are done no longer count.
  await createProject(page, "Due dates AC9");
  await addTask(page, "First late", utcDate(-1));
  await addTask(page, "Second late", utcDate(-2));
  await addTask(page, "Not late", utcDate(1));
  await expect(overdueLine(page)).toHaveText("2 overdue");
  await page.getByRole("button", { name: "Mark done: First late" }).click();
  await expect(page.getByRole("button", { name: "Reopen: First late" })).toBeVisible();
  await page.getByRole("button", { name: "Mark done: Second late" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Second late" })).toBeVisible();
  await expect(page.getByText(/overdue/i)).toHaveCount(0);

  // Tasks due today, later, or with no due date.
  await createProject(page, "Due dates AC10 not due");
  await addTask(page, "Book the venue", "2030-01-15");
  await addTask(page, "Order snacks");
  await addTask(page, "Due today", utcDate(0));
  await expect(taskRow(page, "Book the venue")).toContainText("Due 2030-01-15");
  await expect(page.getByText(/overdue/i)).toHaveCount(0);

  // A project with no tasks.
  await createProject(page, "Due dates AC10");
  await expect(page.getByText("No tasks yet.")).toBeVisible();
  await expect(page.getByText(/overdue/i)).toHaveCount(0);
});
