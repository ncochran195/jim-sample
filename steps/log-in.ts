import type { Page } from "@playwright/test";

/** Logs in through the "Log in" page and waits for the "Projects" page. */
export async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/projects$/);
}
