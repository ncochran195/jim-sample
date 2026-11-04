import type { Page } from "@playwright/test";

/**
 * Presses a task's toggle on the project's page: "Mark done: <title>" or
 * "Reopen: <title>", and waits for the project's page to load again.
 */
export async function toggleTask(
  page: Page,
  action: "Mark done" | "Reopen",
  title: string,
): Promise<void> {
  const loaded = page.waitForEvent("load");
  await page.getByRole("button", { name: `${action}: ${title}`, exact: true }).click();
  await loaded;
}
