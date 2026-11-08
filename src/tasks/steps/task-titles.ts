import type { Page } from "../../../.github/jim/playwright.js";

/** The titles in a project's "Tasks" list, first to last. */
export async function taskTitles(page: Page): Promise<string[]> {
  const titles = await page.locator('ul[aria-label="Tasks"] > li > span').allInnerTexts();
  return titles.map((title) => title.trim());
}
