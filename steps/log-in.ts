import { expect, type Page } from "../.github/jim/playwright.js";

/** Logs in through the "Log in" page and waits for the Projects page. */
export async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
}

/** Logs in as the QA user, from the QA_USER_EMAIL and QA_USER_PASSWORD secrets. */
export async function logInAsQaUser(page: Page) {
  const email = process.env.QA_USER_EMAIL;
  const password = process.env.QA_USER_PASSWORD;
  if (!email || !password) throw new Error("QA_USER_EMAIL and QA_USER_PASSWORD must be set");
  await logIn(page, email, password);
}
