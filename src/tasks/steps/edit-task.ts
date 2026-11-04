import type { Page } from "@playwright/test";

/** Presses "Edit: <title>" on the project's page and waits for the "Edit task" page. */
export async function openEditTask(page: Page, title: string): Promise<void> {
  await page.getByRole("link", { name: `Edit: ${title}`, exact: true }).click();
  await page.waitForURL(/\/tasks\/\d+\/edit$/);
}

/**
 * On the "Edit task" page, sets "Title" and/or "Due date" (an empty string
 * clears it) and presses "Save". Returns the status the post answered (302
 * when it redirected back to the project, 400 for an error) once the
 * resulting page has loaded.
 */
export async function saveTask(
  page: Page,
  changes: { title?: string; due?: string },
): Promise<number> {
  if (changes.title !== undefined) await page.getByLabel("Title").fill(changes.title);
  if (changes.due !== undefined) await page.getByLabel("Due date").fill(changes.due);
  const posted = page.waitForResponse(
    (r) => r.request().method() === "POST" && /\/tasks\/\d+\/edit$/.test(r.url()),
  );
  const loaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Save" }).click();
  const response = await posted;
  await loaded;
  return response.status();
}
