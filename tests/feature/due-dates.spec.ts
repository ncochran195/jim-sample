import { expect, type Page, test } from "../../.github/jim/playwright.js";

// Task due dates: the card's locked feature tests, one per acceptance criterion.

async function newProject(page: Page) {
  const email = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  const name = `Due dates ${Date.now()}`;
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function addTask(page: Page, title: string, due?: string) {
  await page.getByLabel("New task").fill(title);
  if (due) await page.getByLabel("Due date").fill(due);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(task(page, title)).toBeVisible();
}

const tasks = (page: Page) => page.getByRole("list", { name: "Tasks" }).getByRole("listitem");
const task = (page: Page, title: string) => tasks(page).filter({ hasText: title });

test("AC1: Adding a task with a due date", async ({ page }) => {
  await newProject(page);
  await addTask(page, "Pay rent", "2030-12-01");
  await expect(task(page, "Pay rent")).toContainText("Due 2030-12-01");
});

test("AC2: Adding a task without a due date", async ({ page }) => {
  await newProject(page);
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await addTask(page, "Water plants");
  await expect(task(page, "Water plants")).not.toContainText("Due");
});

test("AC3: Overdue tasks are marked", async ({ page }) => {
  await newProject(page);
  await addTask(page, "File taxes", "2020-01-15");
  await expect(task(page, "File taxes")).toContainText("Overdue");
  await page.getByRole("button", { name: "Mark done: File taxes" }).click();
  await expect(page.getByRole("button", { name: "Reopen: File taxes" })).toBeVisible();
  await expect(task(page, "File taxes")).not.toContainText("Overdue");
});

test("AC4: Soonest due first, undated last", async ({ page }) => {
  await newProject(page);
  await addTask(page, "Later", "2031-03-01");
  await addTask(page, "No date");
  await addTask(page, "Sooner", "2030-06-01");
  await expect(tasks(page)).toHaveText([/Later/, /Sooner/, /No date/]);
});
