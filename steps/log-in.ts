import type { Page } from "@playwright/test";

/** Logs in through the "Log in" page and waits for the "Projects" page. */
export async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("heading", { level: 1, name: "Projects" }).waitFor();
}

/** Logs in as the QA user named by the QA_USER_EMAIL and QA_USER_PASSWORD secrets. */
export async function logInAsQaUser(page: Page): Promise<void> {
  const email = process.env.QA_USER_EMAIL;
  const password = process.env.QA_USER_PASSWORD;
  if (!email || !password) throw new Error("QA_USER_EMAIL and QA_USER_PASSWORD must be set");
  await logIn(page, email, password);
}
