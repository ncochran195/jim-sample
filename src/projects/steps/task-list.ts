import { expect, type Page } from "../../../.github/jim/playwright.js";

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The project page's "Tasks" list. */
export function taskList(page: Page) {
  return page.getByRole("list", { name: "Tasks" });
}

/** The row of the "Tasks" list whose title is `title` (matched by its "Edit: <title>" link). */
export function taskRow(page: Page, title: string) {
  return taskList(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: `Edit: ${title}`, exact: true }) });
}

/** The "<N> overdue" line above the list. */
export function overdueLine(page: Page) {
  return page.getByText(/^\s*\d+ overdue\s*$/);
}

/** On a project page, adds a task under "New task", with a due date (YYYY-MM-DD) or none. */
export async function addTask(page: Page, title: string, dueDate?: string) {
  await page.getByLabel("New task").fill(title);
  if (dueDate) await page.getByLabel("Due date").fill(dueDate);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(taskRow(page, title)).toHaveCount(1);
}

/** Presses "Mark done: <title>" or "Reopen: <title>" and waits for the button to flip. */
export async function toggleTask(page: Page, title: string, action: "Mark done" | "Reopen") {
  const other = action === "Mark done" ? "Reopen" : "Mark done";
  await page.getByRole("button", { name: `${action}: ${title}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `${other}: ${title}`, exact: true })).toBeVisible();
}

/** Asserts the row shows "Due <date>". */
export async function expectDueDate(page: Page, title: string, date: string) {
  await expect(taskRow(page, title)).toContainText(`Due ${date}`);
}

/** Asserts the row shows no "Due …" text. */
export async function expectNoDueDate(page: Page, title: string) {
  await expect(taskRow(page, title)).toHaveCount(1);
  await expect(taskRow(page, title)).not.toContainText(/Due \d{4}-\d{2}-\d{2}/);
}

/** Asserts whether the row carries the "Overdue" tag. */
export async function expectOverdue(page: Page, title: string, overdue: boolean) {
  const tag = taskRow(page, title).getByText("Overdue", { exact: true });
  if (overdue) await expect(tag).toBeVisible();
  else await expect(tag).toHaveCount(0);
}

/** Asserts the list's rows, top to bottom, are exactly these titles. */
export async function expectTaskOrder(page: Page, titles: string[]) {
  await expect(taskList(page).getByRole("listitem")).toHaveText(
    titles.map((t) => new RegExp(`^\\s*${escapeRegExp(t)}(\\s|$)`)),
  );
}

export { escapeRegExp };
