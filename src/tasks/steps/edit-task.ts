import { expect, type Page } from "../../../.github/jim/playwright.js";

/** From a project page, presses "Edit: <title>" and waits for the "Edit task" page. */
export async function openEditTask(page: Page, title: string) {
  await page.getByRole("link", { name: `Edit: ${title}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit task", level: 1 })).toBeVisible();
}

/** On the "Edit task" page, sets "Due date" (YYYY-MM-DD, or "" to clear it) and presses "Save". */
export async function saveDueDate(page: Page, dueDate: string) {
  await page.getByLabel("Due date").fill(dueDate);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toHaveCount(0);
}

/** On the "Edit task" page, follows the link back to the project, without saving. */
export async function backToProject(page: Page, projectName: string) {
  await page.getByRole("link", { name: `Back to ${projectName}` }).click();
  await expect(page.getByRole("heading", { name: projectName, level: 1 })).toBeVisible();
}
