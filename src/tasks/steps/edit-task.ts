import type { Page } from "@playwright/test";

/** Presses "Edit: <title>" on the project page and waits for the "Edit task" page. */
export async function openEditTask(page: Page, title: string): Promise<void> {
  await page.getByRole("button", { name: `Edit: ${title}`, exact: true }).click();
  await page.getByRole("heading", { level: 1, name: "Edit task" }).waitFor();
}

export type TaskChanges = {
  /** The new title; left as it is when omitted. */
  title?: string;
  /** The new due date (YYYY-MM-DD), "" to clear it; left as it is when omitted. */
  dueDate?: string;
  /** Removes the "Title" field's `required` attribute, to submit a blank title. */
  bypassRequired?: boolean;
};

/** On the "Edit task" page, fills in the changes, presses "Save" and waits for the next page. */
export async function saveTask(page: Page, changes: TaskChanges): Promise<void> {
  const title = page.getByLabel("Title");
  if (changes.bypassRequired) {
    await title.evaluate((el) => el.removeAttribute("required"));
  }
  if (changes.title !== undefined) await title.fill(changes.title);
  if (changes.dueDate !== undefined) await page.getByLabel("Due date").fill(changes.dueDate);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/edit"));
}
