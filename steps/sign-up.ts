import { expect, type Page } from "../.github/jim/playwright.js";

/** Signs up through the "Sign up" page and waits for the Projects page, signed in as `email`. */
export async function signUp(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
  await expect(page.getByRole("banner")).toContainText(email);
}

/** Presses "Log out" in the banner and waits for the "Log in" page. */
export async function logOut(page: Page) {
  await page.getByRole("banner").getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Log in", level: 1 })).toBeVisible();
}
