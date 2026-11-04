import type { Page } from "@playwright/test";

/**
 * Adds a task with the project page's add-task form: types `title` into
 * "New task", `due` into "Due date" when given, and presses "Add task".
 * Returns the status the form post answered (302 when it redirected back to
 * the project, 400 for an error) once the resulting page has loaded.
 */
export async function addTask(page: Page, title: string, due?: string): Promise<number> {
  await page.getByLabel("New task").fill(title);
  if (due !== undefined) await page.getByLabel("Due date").fill(due);
  const posted = page.waitForResponse(
    (r) => r.request().method() === "POST" && /\/projects\/\d+\/tasks$/.test(r.url()),
  );
  const loaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Add task" }).click();
  const response = await posted;
  await loaded;
  return response.status();
}
