import { expect, test } from "../../../.github/jim/playwright.js";
import { logIn } from "../../../steps/log-in.js";
import { createProject } from "../../projects/steps/create-project.js";
import { addTask } from "./add-task.js";
import { taskTitles } from "./task-titles.js";

// The card's test: its test plan, one test per plan item, against QA as the QA user.

const TASKS = ["Write the copy", "Book the venue", "Pay the printer"];
const output = process.env.JIM_OUTPUT ?? "test-results";

test.describe.configure({ mode: "serial" });

test("AC1: tasks stay in the order they were added", async ({ page }) => {
  await logIn(page);
  await createProject(page, `jim-eval-order-${Date.now()}`);
  for (const title of TASKS) await addTask(page, title);
  expect(await taskTitles(page)).toEqual(TASKS);
  await page.screenshot({ path: `${output}/ac1.png` });
});

test("AC2: marking a task done keeps its place", async ({ page }) => {
  await logIn(page);
  await createProject(page, `jim-eval-done-${Date.now()}`);
  for (const title of TASKS) await addTask(page, title);
  await page.getByRole("button", { name: "Mark done: Book the venue" }).click();
  await expect(page.getByRole("button", { name: "Reopen: Book the venue" })).toBeVisible();
  expect(await taskTitles(page)).toEqual(TASKS);
  await page.screenshot({ path: `${output}/ac2.png` });
});
