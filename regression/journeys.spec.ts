import { expect, type Page, test } from "../.github/jim/playwright.js";

// jim-sample's Regression suite for the runner's eval: two journeys, each
// guarding a card, run against QA as the QA user.

const LOG_IN_CARD = "@card-64e1a0c0ffee000000000001";
const PROJECTS_CARD = "@card-64e1a0c0ffee000000000002";

async function logIn(page: Page, password = process.env.QA_USER_PASSWORD ?? "") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.QA_USER_EMAIL ?? "");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("a user logs in, after a wrong password", { tag: [LOG_IN_CARD] }, async ({ page }) => {
  await logIn(page, "not-the-password");
  await expect(page.getByRole("alert")).toHaveText("Wrong email or password.");
  await logIn(page);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
});

test("a project's task is marked done", { tag: [PROJECTS_CARD] }, async ({ page }) => {
  await logIn(page);
  const project = `jim-nightly-${Date.now()}`;
  await page.getByLabel("New project name").fill(project);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: project })).toBeVisible();
  await page.getByLabel("New task").fill("Write the copy");
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByRole("button", { name: "Mark done: Write the copy" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Write the copy" })).toBeVisible();
});
