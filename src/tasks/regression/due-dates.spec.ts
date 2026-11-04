import type { Page } from "@playwright/test";
import { expect, test } from "../../../.github/jim/playwright.js";
import { logIn } from "../../../steps/log-in.js";
import { addTask } from "../../projects/steps/add-task.js";
import { createProject } from "../../projects/steps/create-project.js";
import { taskRow, taskTitles } from "../../projects/steps/task-row.js";
import { toggleTask } from "../../projects/steps/toggle-task.js";
import { openEditTask, saveTask } from "../steps/edit-task.js";

// Guards the "Task due dates" card. The app can't delete projects or tasks,
// so each test makes its own uniquely named project and leaves it on QA.

const CARD = "@card-6aeab03b40786a83cee8fa2c";

function uniqueName(label: string): string {
  return `jim-nightly-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)} ${label}`;
}

async function signIn(page: Page): Promise<void> {
  await logIn(page, process.env.QA_USER_EMAIL ?? "", process.env.QA_USER_PASSWORD ?? "");
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("a task's due date is shown, and can be changed and cleared on the Edit task page", {
  tag: [CARD],
}, async ({ page }) => {
  const projectPath = await createProject(page, uniqueName("due dates"));
  const task = uniqueName("Book the venue");

  // AC1: added with a due date, the task shows it.
  expect(await addTask(page, task, "2099-03-15")).toBe(302);
  await expect(taskRow(page, task)).toContainText("Due 2099-03-15");

  // AC3: the Edit task page shows the task's values, and saving a new date shows it.
  await openEditTask(page, task);
  await expect(page.getByLabel("Title")).toHaveValue(task);
  await expect(page.getByLabel("Due date")).toHaveValue("2099-03-15");
  expect(await saveTask(page, { due: "2099-04-01" })).toBe(302);
  expect(new URL(page.url()).pathname).toBe(projectPath);
  await expect(taskRow(page, task)).toContainText("Due 2099-04-01");

  // AC4: clearing the due date leaves the task with no "Due" text.
  await openEditTask(page, task);
  expect(await saveTask(page, { due: "" })).toBe(302);
  const row = taskRow(page, task);
  await expect(row).toHaveCount(1);
  await expect(row).not.toContainText("Due");
});

test("the task list puts the earliest due dates first and tags only open overdue tasks", {
  tag: [CARD],
}, async ({ page }) => {
  await createProject(page, uniqueName("overdue and order"));
  const later = uniqueName("C later");
  const undated = uniqueName("B no date");
  const sooner = uniqueName("A sooner");
  const past = uniqueName("D past due");

  // AC10: added in this order, listed by due date with undated tasks last.
  for (const [title, due] of [
    [later, "2099-06-01"],
    [undated, undefined],
    [sooner, "2099-01-10"],
    [past, "2020-01-15"],
  ] as const) {
    expect(await addTask(page, title, due)).toBe(302);
  }
  const ordered = [past, sooner, later, undated];
  expect(await taskTitles(page)).toEqual(ordered);

  // AC8: only the open task whose date has passed is tagged "Overdue".
  const overdue = (title: string) => taskRow(page, title).getByText("Overdue", { exact: true });
  await expect(taskRow(page, past)).toContainText("Due 2020-01-15");
  await expect(overdue(past)).toBeVisible();
  for (const title of [sooner, later, undated]) await expect(overdue(title)).toHaveCount(0);

  // AC9: a done task keeps its date but loses the tag, which comes back on reopening.
  await toggleTask(page, "Mark done", past);
  await expect(taskRow(page, past)).toContainText("Due 2020-01-15");
  await expect(overdue(past)).toHaveCount(0);
  expect(await taskTitles(page)).toEqual(ordered);
  await toggleTask(page, "Reopen", past);
  await expect(overdue(past)).toBeVisible();
});
