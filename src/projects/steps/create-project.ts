import type { Page } from "@playwright/test";

/** Creates a project from the "Projects" page and returns its page's path. */
export async function createProject(page: Page, name: string): Promise<string> {
  await page.goto("/projects");
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/\d+$/);
  return new URL(page.url()).pathname;
}
