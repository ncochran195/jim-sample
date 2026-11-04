import type { Page } from "@playwright/test";

/** Presses "Mark done: <title>" on the project page and waits for it to become "Reopen". */
export async function markDone(page: Page, title: string): Promise<void> {
  await page.getByRole("button", { name: `Mark done: ${title}`, exact: true }).click();
  await page.getByRole("button", { name: `Reopen: ${title}`, exact: true }).waitFor();
}

/** Presses "Reopen: <title>" on the project page and waits for it to become "Mark done". */
export async function reopen(page: Page, title: string): Promise<void> {
  await page.getByRole("button", { name: `Reopen: ${title}`, exact: true }).click();
  await page.getByRole("button", { name: `Mark done: ${title}`, exact: true }).waitFor();
}
