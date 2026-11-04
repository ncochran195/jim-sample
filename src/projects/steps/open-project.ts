import type { Page } from "@playwright/test";

/**
 * Opens a project from the "Projects" page by its exact name. Projects are
 * listed newest first, so when several share the name, the newest opens.
 */
export async function openProject(page: Page, name: string): Promise<string> {
  await page.goto("/projects");
  await page.getByRole("link", { name, exact: true }).first().click();
  await page.waitForURL(/\/projects\/\d+$/);
  return new URL(page.url()).pathname;
}
