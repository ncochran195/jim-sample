import type { Locator, Page } from "@playwright/test";

export type ListedTask = {
  title: string;
  /** The date after "Due", or null when no "Due" text shows. */
  due: string | null;
  overdue: boolean;
  done: boolean;
};

/** The project page's "Tasks" list. */
export function tasksList(page: Page): Locator {
  return page.getByRole("list", { name: "Tasks" });
}

/** The "Tasks" list item whose title is exactly `title`. */
export function taskItem(page: Page, title: string): Locator {
  return tasksList(page)
    .getByRole("listitem")
    .filter({ has: page.getByText(title, { exact: true }) });
}

/** Reads the "Tasks" list top to bottom. */
export async function readTasks(page: Page): Promise<ListedTask[]> {
  const items = await tasksList(page).getByRole("listitem").all();
  const tasks: ListedTask[] = [];
  for (const item of items) {
    const titleEl = item.locator("span").first();
    const title = ((await titleEl.textContent()) ?? "").trim();
    const text = (await item.textContent()) ?? "";
    const due = /\bDue\s+(\d{4}-\d{2}-\d{2})\b/.exec(text)?.[1] ?? null;
    const overdue = (await item.getByText("Overdue", { exact: true }).count()) > 0;
    const done = (await item.getByRole("button", { name: /^Reopen: / }).count()) > 0;
    tasks.push({ title, due, overdue, done });
  }
  return tasks;
}
