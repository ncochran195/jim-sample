import { expect, type Page } from "../../../.github/jim/playwright.js";

/** Creates a project from the projects page, and waits for its own page. */
export async function createProject(page: Page, name: string): Promise<void> {
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}
