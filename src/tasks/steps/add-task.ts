import type { Page } from "@playwright/test";

/**
 * Adds a task with the project page's "New task" form, with an optional
 * due date (YYYY-MM-DD), and waits for the project page to load again.
 */
export async function addTask(page: Page, title: string, dueDate?: string): Promise<void> {
  await page.getByLabel("New task").fill(title);
  if (dueDate) await page.getByLabel("Due date").fill(dueDate);
  await page.getByRole("button", { name: "Add task" }).click();
  await page.waitForLoadState("load");
  await page.getByRole("button", { name: "Add task" }).waitFor();
}
