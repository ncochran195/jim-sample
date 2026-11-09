import { expect, type Page } from "../../../.github/jim/playwright.js";

/** Creates a project from the Projects page; leaves the page on the new project and returns its URL. */
export async function createProject(page: Page, name: string) {
  await page.goto("/projects");
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  return page.url();
}

/**
 * Opens a project by name from the Projects page. Projects are listed newest
 * first, so when several share the name, this opens the newest.
 */
export async function openProject(page: Page, name: string) {
  await page.goto("/projects");
  await page.getByRole("link", { name, exact: true }).first().click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  return page.url();
}
