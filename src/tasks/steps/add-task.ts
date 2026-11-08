import { expect, type Page } from "../../../.github/jim/playwright.js";

/** Adds a task on a project's page, and waits for its "Mark done" button. */
export async function addTask(page: Page, title: string): Promise<void> {
  await page.getByLabel("New task").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("button", { name: `Mark done: ${title}` })).toBeVisible();
}
