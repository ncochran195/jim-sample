import type { Page } from "@playwright/test";

/**
 * Creates a project from the "Projects" page and waits on its page.
 * Returns the project page's path, such as "/projects/42".
 */
export async function createProject(page: Page, name: string): Promise<string> {
  await page.goto("/projects");
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByRole("heading", { level: 1, name }).waitFor();
  return new URL(page.url()).pathname;
}
