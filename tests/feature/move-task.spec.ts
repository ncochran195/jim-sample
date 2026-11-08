import { expect, type Page, test } from "../../.github/jim/playwright.js";

// Move a task to another project: the card's locked feature tests, one per acceptance criterion.

async function signUp(page: Page) {
  const email = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
}

/** Creates a project and returns to the projects page. */
async function createProject(page: Page, name: string) {
  await page.goto("/projects");
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function openProject(page: Page, name: string) {
  await page.goto("/projects");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function addTask(page: Page, title: string) {
  await page.getByLabel("New task").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(tasks(page).getByText(title)).toBeVisible();
}

async function moveTask(page: Page, title: string, to: string) {
  await page.getByLabel(`Move ${title} to`).selectOption({ label: to });
  await page.getByRole("button", { name: `Move: ${title}` }).click();
}

const tasks = (page: Page) => page.getByRole("list", { name: "Tasks" });

/** Two fresh projects, Alpha and Beta, with this test's own names. */
async function twoProjects(page: Page) {
  const n = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const alpha = `Alpha ${n}`;
  const beta = `Beta ${n}`;
  await signUp(page);
  await createProject(page, alpha);
  await createProject(page, beta);
  return { alpha, beta };
}

test("AC1: Moving a task", async ({ page }) => {
  const { alpha, beta } = await twoProjects(page);
  await openProject(page, alpha);
  await addTask(page, "Fix login");
  await moveTask(page, "Fix login", beta);
  await openProject(page, alpha);
  await expect(page.getByText("Fix login")).toHaveCount(0);
  await openProject(page, beta);
  await expect(tasks(page).getByText("Fix login")).toBeVisible();
});

test("AC2: A moved task stays done", async ({ page }) => {
  const { alpha, beta } = await twoProjects(page);
  await openProject(page, alpha);
  await addTask(page, "Ship it");
  await page.getByRole("button", { name: "Mark done: Ship it" }).click();
  await moveTask(page, "Ship it", beta);
  await openProject(page, beta);
  await expect(page.getByRole("button", { name: "Reopen: Ship it" })).toBeVisible();
});

test("AC3: Open counts follow the task", async ({ page }) => {
  const { alpha, beta } = await twoProjects(page);
  await openProject(page, alpha);
  await addTask(page, "Fix login");
  await moveTask(page, "Fix login", beta);
  await page.goto("/projects");
  await expect(page.getByRole("listitem").filter({ hasText: alpha })).toContainText("(0 open)");
  await expect(page.getByRole("listitem").filter({ hasText: beta })).toContainText("(1 open)");
});

test("AC4: Only other projects are offered", async ({ page }) => {
  const { alpha, beta } = await twoProjects(page);
  await openProject(page, alpha);
  await addTask(page, "Fix login");
  const menu = page.getByLabel("Move Fix login to");
  await expect(menu.getByRole("option", { name: beta })).toHaveCount(1);
  await expect(menu.getByRole("option", { name: alpha })).toHaveCount(0);
});
