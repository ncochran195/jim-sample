import { expect, type Page } from "../.github/jim/playwright.js";

/** Logs in as the QA user, from the login page, and waits for the projects page. */
export async function logIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.QA_USER_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.QA_USER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
}
