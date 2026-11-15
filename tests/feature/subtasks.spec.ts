import { expect, type Page, test } from "../../.github/jim/playwright.js";

// Subtasks: adding them on a task's "Edit task" page, marking them done and
// reopening them, and the "<done>/<total> subtasks done" progress on the
// project's page.

function uniqueEmail() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
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
  await page.getByLabel("New task", { exact: true }).fill(title);
  if (dueDate) await page.getByLabel("Due date").fill(dueDate);
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

/** Opens a task's "Edit task" page from its project's page and returns its URL. */
async function openEditPage(page: Page, title: string) {
  await page.getByRole("link", { name: `Edit: ${title}` }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  return page.url();
}

function subtaskList(page: Page) {
  return page.getByRole("list", { name: "Subtasks" });
}

function subtaskRows(page: Page) {
  return subtaskList(page).getByRole("listitem");
}

function subtaskRow(page: Page, title: string) {
  return subtaskRows(page).filter({ hasText: new RegExp(escapeRegExp(title)) });
}

function newSubtaskInput(page: Page) {
  return page.getByLabel("New subtask", { exact: true });
}

/** Adds a subtask on the current "Edit task" page and waits for it to show. */
async function addSubtask(page: Page, title: string, shownAs = title.trim()) {
  await newSubtaskInput(page).fill(title);
  await page.getByRole("button", { name: "Add subtask" }).click();
  await expect(subtaskRow(page, shownAs)).toHaveCount(1);
}

async function markSubtaskDone(page: Page, title: string) {
  await page.getByRole("button", { name: `Mark done: ${title}` }).click();
  await expect(page.getByRole("button", { name: `Reopen: ${title}` })).toBeVisible();
}

async function expectSubtaskOpen(page: Page, title: string) {
  const row = subtaskRow(page, title);
  await expect(row).toHaveCount(1);
  await expect(row.getByText(title, { exact: true })).not.toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  await expect(page.getByRole("button", { name: `Mark done: ${title}` })).toHaveText("Mark done");
  await expect(page.getByRole("button", { name: `Reopen: ${title}` })).toHaveCount(0);
}

async function expectSubtaskDone(page: Page, title: string) {
  const row = subtaskRow(page, title);
  await expect(row).toHaveCount(1);
  await expect(row.getByText(title, { exact: true })).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  await expect(row.getByText(title, { exact: true })).toHaveClass(/\bdone\b/);
  await expect(page.getByRole("button", { name: `Reopen: ${title}` })).toHaveText("Reopen");
  await expect(page.getByRole("button", { name: `Mark done: ${title}` })).toHaveCount(0);
}

const SUBTASK_PROGRESS = /\d+\/\d+ subtasks done/;

test('AC1: The "Edit task" page shows a Subtasks section', async ({ page }) => {
  await signUp(page);
  const projectUrl = await createProject(page, "Subtasks AC1");
  await addTask(page, "Plan offsite");
  await openEditPage(page, "Plan offsite");

  await expect(page.getByLabel("Due date")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Subtasks" })).toBeVisible();
  await expect(page.getByText("No subtasks yet.")).toBeVisible();
  await expect(newSubtaskInput(page)).toBeVisible();
  await expect(newSubtaskInput(page)).toHaveAttribute("required", "");
  await expect(newSubtaskInput(page)).toHaveAttribute("maxlength", "200");
  await expect(page.getByRole("button", { name: "Add subtask" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Subtasks AC1" })).toBeVisible();

  // The Subtasks section sits below the due date form.
  const saveBox = await page.getByRole("button", { name: "Save" }).boundingBox();
  const headingBox = await page.getByRole("heading", { name: "Subtasks" }).boundingBox();
  if (!saveBox || !headingBox) throw new Error("expected the Save button and Subtasks heading");
  expect(headingBox.y).toBeGreaterThan(saveBox.y);

  // The due date form works as before.
  await page.getByLabel("Due date").fill("2030-01-15");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Subtasks AC1" })).toBeVisible();
  expect(page.url()).toBe(projectUrl);
  await expect(taskRow(page, "Plan offsite")).toContainText("Due 2030-01-15");

  // And so does the link back to the project.
  await openEditPage(page, "Plan offsite");
  await expect(page.getByLabel("Due date")).toHaveValue("2030-01-15");
  await page.getByRole("link", { name: "Back to Subtasks AC1" }).click();
  await expect(page.getByRole("heading", { name: "Subtasks AC1" })).toBeVisible();
  expect(page.url()).toBe(projectUrl);
});

test("AC2: Adding a subtask", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Subtasks AC2");
  await addTask(page, "Plan offsite");
  const editUrl = await openEditPage(page, "Plan offsite");

  await newSubtaskInput(page).fill("Book a venue");
  await page.getByRole("button", { name: "Add subtask" }).click();

  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  expect(page.url()).toBe(editUrl);
  await expect(page.getByText("Plan offsite", { exact: true })).toBeVisible();
  await expect(page.getByText("No subtasks yet.")).toHaveCount(0);
  await expect(subtaskRows(page)).toHaveText([/Book a venue/]);
  await expectSubtaskOpen(page, "Book a venue");

  // Spaces around the title are trimmed.
  await newSubtaskInput(page).fill("   Hire a band   ");
  await page.getByRole("button", { name: "Add subtask" }).click();
  expect(page.url()).toBe(editUrl);
  await expect(subtaskRows(page)).toHaveText([/Book a venue/, /Hire a band/]);
  await expect(subtaskList(page).getByText("Hire a band", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark done: Hire a band" })).toBeVisible();
});

test("AC3: Subtasks are listed in the order added", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Subtasks AC3");
  await addTask(page, "Plan offsite");
  await openEditPage(page, "Plan offsite");

  await addSubtask(page, "Book a venue");
  await addSubtask(page, "Send invites");
  await addSubtask(page, "Order food");

  const order = [/Book a venue/, /Send invites/, /Order food/];
  await expect(subtaskRows(page)).toHaveText(order);

  await page.reload();
  await expect(subtaskRows(page)).toHaveText(order);
});

test("AC4: Marking a subtask done and reopening it", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Subtasks AC4");
  await addTask(page, "Plan offsite");
  const editUrl = await openEditPage(page, "Plan offsite");
  await addSubtask(page, "Send invites");
  await expectSubtaskOpen(page, "Send invites");

  await page.getByRole("button", { name: "Mark done: Send invites" }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  expect(page.url()).toBe(editUrl);
  await expectSubtaskDone(page, "Send invites");

  await page.getByRole("button", { name: "Reopen: Send invites" }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  expect(page.url()).toBe(editUrl);
  await expectSubtaskOpen(page, "Send invites");
});

test("AC5: Invalid subtask titles add nothing", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Subtasks AC5");
  await addTask(page, "Plan offsite");
  const editUrl = await openEditPage(page, "Plan offsite");
  await addSubtask(page, "Book a venue");

  // Only spaces.
  await newSubtaskInput(page).fill("     ");
  await page.getByRole("button", { name: "Add subtask" }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  expect(page.url()).toBe(editUrl);
  await expect(subtaskRows(page)).toHaveText([/Book a venue/]);

  // Titles the form would refuse, sent straight to the server.
  const addUrl = `${editUrl.replace(/\/edit$/, "")}/subtasks`;
  for (const title of ["", "a".repeat(201)]) {
    const response = await page.request.post(addUrl, { form: { title } });
    expect(response.ok()).toBe(true);
    expect(response.url()).toBe(editUrl);
  }
  await page.reload();
  await expect(subtaskRows(page)).toHaveText([/Book a venue/]);

  // The input holds at most 200 characters.
  await expect(newSubtaskInput(page)).toHaveAttribute("maxlength", "200");
  await newSubtaskInput(page).fill("a".repeat(205));
  await expect(newSubtaskInput(page)).toHaveValue("a".repeat(200));
  await page.getByRole("button", { name: "Add subtask" }).click();
  expect(page.url()).toBe(editUrl);
  await expect(subtaskRows(page)).toHaveText([/Book a venue/, /a{200}/]);
  await expect(subtaskList(page).getByText("a".repeat(200), { exact: true })).toBeVisible();
});

test("AC6: Subtask progress on the project's page", async ({ page }) => {
  await signUp(page);
  const projectUrl = await createProject(page, "Subtasks AC6");
  await addTask(page, "Plan offsite", "2030-01-15");
  await addTask(page, "Write minutes");

  await openEditPage(page, "Plan offsite");
  await addSubtask(page, "Book a venue");
  await addSubtask(page, "Send invites");
  await addSubtask(page, "Order food");
  await markSubtaskDone(page, "Book a venue");
  await page.getByRole("link", { name: "Back to Subtasks AC6" }).click();
  await expect(page.getByRole("heading", { name: "Subtasks AC6" })).toBeVisible();
  expect(page.url()).toBe(projectUrl);

  const plan = taskRow(page, "Plan offsite");
  await expect(plan.getByText("1/3 subtasks done", { exact: true })).toBeVisible();
  await expect(plan.getByText("1/3 subtasks done", { exact: true })).toHaveClass(/\bsubtasks\b/);
  await expect(plan).toHaveText(/Plan offsite[\s\S]*Due 2030-01-15[\s\S]*1\/3 subtasks done/);
  await expect(taskRow(page, "Write minutes")).toHaveCount(1);
  await expect(taskRow(page, "Write minutes")).not.toContainText(SUBTASK_PROGRESS);
  await expect(taskRow(page, "Write minutes")).not.toContainText("subtask");

  await openEditPage(page, "Plan offsite");
  await markSubtaskDone(page, "Send invites");
  await markSubtaskDone(page, "Order food");
  await page.getByRole("link", { name: "Back to Subtasks AC6" }).click();
  await expect(page.getByRole("heading", { name: "Subtasks AC6" })).toBeVisible();
  await expect(plan.getByText("3/3 subtasks done", { exact: true })).toBeVisible();
  await expect(plan).not.toContainText("1/3 subtasks done");

  // Reopening one brings the count back down.
  await openEditPage(page, "Plan offsite");
  await page.getByRole("button", { name: "Reopen: Order food" }).click();
  await expect(page.getByRole("button", { name: "Mark done: Order food" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Subtasks AC6" }).click();
  await expect(plan.getByText("2/3 subtasks done", { exact: true })).toBeVisible();
});

test("AC7: Subtasks don't change the task itself", async ({ page }) => {
  await signUp(page);
  const projectUrl = await createProject(page, "Subtasks AC7");
  await addTask(page, "Plan offsite", "2020-01-01");
  await openEditPage(page, "Plan offsite");
  await addSubtask(page, "Book a venue");
  await addSubtask(page, "Send invites");
  await page.getByRole("link", { name: "Back to Subtasks AC7" }).click();
  await expect(page.getByRole("heading", { name: "Subtasks AC7" })).toBeVisible();

  const plan = taskRow(page, "Plan offsite");
  await expect(plan.getByText("0/2 subtasks done", { exact: true })).toBeVisible();
  await expect(page.getByText(/^\s*1 overdue\s*$/)).toBeVisible();

  await page.getByRole("button", { name: "Mark done: Plan offsite" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Plan offsite" })).toBeVisible();
  await expect(plan.getByText("Plan offsite", { exact: true })).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  await expect(plan).not.toContainText("Overdue");
  await expect(plan.getByText("0/2 subtasks done", { exact: true })).toBeVisible();
  await expect(page.getByText(/overdue/i)).toHaveCount(0);
  await expect(taskList(page).getByRole("listitem")).toHaveText([/Plan offsite/]);

  await openEditPage(page, "Plan offsite");
  await expectSubtaskOpen(page, "Book a venue");
  await expectSubtaskOpen(page, "Send invites");
  await page.getByRole("link", { name: "Back to Subtasks AC7" }).click();
  expect(page.url()).toBe(projectUrl);

  await page.getByRole("button", { name: "Reopen: Plan offsite" }).click();
  await expect(page.getByRole("button", { name: "Mark done: Plan offsite" })).toBeVisible();
  await expect(page.getByText(/^\s*1 overdue\s*$/)).toBeVisible();
  await expect(plan.getByText("0/2 subtasks done", { exact: true })).toBeVisible();
  await expect(taskList(page).getByRole("listitem")).toHaveText([/Plan offsite/]);

  await page.goto("/projects");
  await expect(page.getByRole("listitem").filter({ hasText: "Subtasks AC7" })).toHaveText(
    /Subtasks AC7\s*\(1 open\)/,
  );
});

test("AC8: Subtasks belong to one task", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Subtasks AC8");
  await addTask(page, "Plan offsite");
  await addTask(page, "Write minutes");

  await openEditPage(page, "Plan offsite");
  await addSubtask(page, "Book a venue");
  await page.getByRole("link", { name: "Back to Subtasks AC8" }).click();
  await expect(page.getByRole("heading", { name: "Subtasks AC8" })).toBeVisible();

  await openEditPage(page, "Write minutes");
  await expect(page.getByRole("heading", { name: "Subtasks" })).toBeVisible();
  await expect(page.getByText("No subtasks yet.")).toBeVisible();
  await expect(page.getByText("Book a venue")).toHaveCount(0);
  await expect(subtaskRows(page)).toHaveCount(0);
});

test("AC9: Tasks from before the change", async ({ page }) => {
  // The feature app starts with an empty database, so the "Team handbook" demo
  // project is rebuilt here: tasks added with no subtasks, as existing ones are.
  await signUp(page);
  const projectUrl = await createProject(page, "Team handbook");
  await addTask(page, "Write the welcome page");
  await addTask(page, "List the tools we use");
  await addTask(page, "Agree on a review rota");
  await page.getByRole("button", { name: "Mark done: Agree on a review rota" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Agree on a review rota" })).toBeVisible();

  const titles = ["Write the welcome page", "List the tools we use", "Agree on a review rota"];
  const order = titles.map((t) => new RegExp(escapeRegExp(t)));
  await expect(taskList(page).getByRole("listitem")).toHaveText(order);
  for (const title of titles) {
    await expect(taskRow(page, title)).not.toContainText("subtask");
  }
  await expect(
    taskRow(page, "Agree on a review rota").getByText("Agree on a review rota", { exact: true }),
  ).toHaveCSS("text-decoration-line", "line-through");

  await openEditPage(page, "Write the welcome page");
  await expect(page.getByRole("heading", { name: "Subtasks" })).toBeVisible();
  await expect(page.getByText("No subtasks yet.")).toBeVisible();
  await page.getByRole("link", { name: "Back to Team handbook" }).click();

  await expect(page.getByRole("heading", { name: "Team handbook" })).toBeVisible();
  expect(page.url()).toBe(projectUrl);
  await expect(taskList(page).getByRole("listitem")).toHaveText(order);
  for (const title of titles) {
    await expect(taskRow(page, title)).not.toContainText("subtask");
  }
});

test("AC10: Subtask titles are shown as text", async ({ page }) => {
  await signUp(page);
  await createProject(page, "Subtasks AC10");
  await addTask(page, "Plan offsite");
  await openEditPage(page, "Plan offsite");

  const title = '<b>bold</b> & "quoted"';
  await addSubtask(page, title);

  await expect(subtaskRows(page)).toHaveText([new RegExp(escapeRegExp(title))]);
  await expect(subtaskList(page).getByText(title, { exact: true })).toBeVisible();
  await expect(subtaskList(page).getByText("bold", { exact: true })).toHaveCount(0);
});
