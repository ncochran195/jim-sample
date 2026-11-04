import type { Page } from "@playwright/test";

/** Opens a project by following its link on the "Projects" page (the first, if several share the name). */
export async function openProjectFromList(page: Page, name: string): Promise<string> {
  await page.goto("/projects");
  await page.getByRole("link", { name, exact: true }).first().click();
  await page.getByRole("heading", { level: 1, name }).waitFor();
  return new URL(page.url()).pathname;
}

/** Opens a project page by its path, such as "/projects/42". */
export async function openProject(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.getByRole("list", { name: "Tasks" }).or(page.getByText("No tasks yet.")).waitFor();
}
