import type { Locator, Page } from "@playwright/test";

/** The "Tasks" list on a project's page. */
export function taskList(page: Page): Locator {
  return page.getByRole("list", { name: "Tasks" });
}

/** The item in the "Tasks" list whose title is exactly `title`. */
export function taskRow(page: Page, title: string): Locator {
  return taskList(page)
    .getByRole("listitem")
    .filter({ has: page.getByText(title, { exact: true }) });
}

/** The task titles in the "Tasks" list, top to bottom. */
export async function taskTitles(page: Page): Promise<string[]> {
  return taskList(page)
    .getByRole("listitem")
    .evaluateAll((items) =>
      items.map((item) => item.querySelector("span")?.textContent?.trim() ?? ""),
    );
}
