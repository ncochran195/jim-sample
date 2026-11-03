import { expect, type Page, test } from "../../.github/jim/playwright.js";

// The app's key journeys: sign up, log in, and create a project and add a task.

function uniqueEmail() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function signUp(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
}

test("sign up", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email, "password123");
  await expect(page.getByText(email)).toBeVisible();
});

test("log in", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email, "password123");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Wrong email or password.");

  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
});

test("create a project and add a task", async ({ page }) => {
  await signUp(page, uniqueEmail(), "password123");
  const project = `Launch ${Date.now()}`;
  await page.getByLabel("New project name").fill(project);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: project })).toBeVisible();

  await page.getByLabel("New task").fill("Write the copy");
  await page.getByRole("button", { name: "Add task" }).click();
  const tasks = page.getByRole("list", { name: "Tasks" });
  await expect(tasks.getByText("Write the copy")).toBeVisible();

  await page.getByRole("button", { name: "Mark done: Write the copy" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Write the copy" })).toBeVisible();
});
