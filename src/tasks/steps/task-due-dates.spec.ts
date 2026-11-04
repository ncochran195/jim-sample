import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "../../../.github/jim/playwright.js";
import { logIn } from "../../../steps/log-in.js";
import { loosenInput } from "../../../steps/loosen-input.js";
import { addTask } from "../../projects/steps/add-task.js";
import { createProject } from "../../projects/steps/create-project.js";
import { openProject } from "../../projects/steps/open-project.js";
import { taskList, taskRow, taskTitles } from "../../projects/steps/task-row.js";
import { toggleTask } from "../../projects/steps/toggle-task.js";
import { openEditTask, saveTask } from "./edit-task.js";

// The "Task due dates" card. The tests share data and run in order: later
// items find the projects earlier ones made by name (the newest of that name).
const PREFIX = "jim-cee8fa2c";
const DUE_DATES = `${PREFIX} Due dates QA`;
const OVERDUE = `${PREFIX} Overdue QA`;
const ORDER = `${PREFIX} Order QA`;
const TITLE_ERROR = "Give the task a title of 1 to 200 characters.";
const DUE_ERROR = "Give the due date as a real date, or leave it empty.";
const RED = "rgb(176, 0, 32)";

async function signIn(page: Page): Promise<void> {
  await logIn(page, process.env.QA_USER_EMAIL ?? "", process.env.QA_USER_PASSWORD ?? "");
}

async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env.JIM_OUTPUT ?? "test-results";
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

function utcDate(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("AC1: add a task with a due date", async ({ page }) => {
  await createProject(page, DUE_DATES);
  expect(await addTask(page, "Book the venue", "2099-03-15")).toBe(302);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(DUE_DATES);
  const row = taskRow(page, "Book the venue");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Due 2099-03-15");
  await expect(row.getByText("Overdue", { exact: true })).toHaveCount(0);
  await shot(page, "ac1");
});

test("AC2: add a task without a due date", async ({ page }) => {
  await openProject(page, DUE_DATES);
  expect(await addTask(page, "Order snacks")).toBe(302);
  const row = taskRow(page, "Order snacks");
  await expect(row).toHaveCount(1);
  await expect(row).not.toContainText("Due");
  await expect(row.getByText("Overdue", { exact: true })).toHaveCount(0);
  await shot(page, "ac2");
});

test("AC3: open the Edit task page for Book the venue", async ({ page }) => {
  const projectPath = await openProject(page, DUE_DATES);
  await openEditTask(page, "Book the venue");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edit task");
  await expect(page.getByLabel("Title")).toHaveValue("Book the venue");
  await expect(page.getByLabel("Due date")).toHaveValue("2099-03-15");
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  const back = page.getByRole("link", { name: "Back to the project" });
  await expect(back).toHaveAttribute("href", projectPath);
  await shot(page, "ac3a");
});

test("AC3: change the due date and save", async ({ page }) => {
  const projectPath = await openProject(page, DUE_DATES);
  await openEditTask(page, "Book the venue");
  expect(await saveTask(page, { due: "2099-04-01" })).toBe(302);
  expect(new URL(page.url()).pathname).toBe(projectPath);
  await expect(taskRow(page, "Book the venue")).toContainText("Due 2099-04-01");
  await shot(page, "ac3b");
});

test("AC4: give Order snacks a due date", async ({ page }) => {
  await openProject(page, DUE_DATES);
  await openEditTask(page, "Order snacks");
  expect(await saveTask(page, { due: "2099-05-05" })).toBe(302);
  await expect(taskRow(page, "Order snacks")).toContainText("Due 2099-05-05");
  await shot(page, "ac4a");
});

test("AC4: clear Order snacks' due date", async ({ page }) => {
  await openProject(page, DUE_DATES);
  await openEditTask(page, "Order snacks");
  expect(await saveTask(page, { due: "" })).toBe(302);
  const row = taskRow(page, "Order snacks");
  await expect(row).toHaveCount(1);
  await expect(row).not.toContainText("Due");
  await shot(page, "ac4b");
});

test("AC5: change the title", async ({ page }) => {
  await openProject(page, DUE_DATES);
  await openEditTask(page, "Order snacks");
  expect(await saveTask(page, { title: "Order snacks and drinks" })).toBe(302);
  const row = taskRow(page, "Order snacks and drinks");
  await expect(row).toHaveCount(1);
  await expect(row).not.toContainText("Due");
  await expect(taskRow(page, "Order snacks")).toHaveCount(0);
  await shot(page, "ac5a");
});

test("AC5: an empty title is refused", async ({ page }) => {
  const projectPath = await openProject(page, DUE_DATES);
  await openEditTask(page, "Order snacks and drinks");
  await loosenInput(page, "Title", { removeRequired: true });
  expect(await saveTask(page, { title: "" })).toBe(400);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edit task");
  await expect(page.getByRole("alert")).toHaveText(TITLE_ERROR);
  await shot(page, "ac5b");
  await page.goto(projectPath);
  await expect(taskRow(page, "Order snacks and drinks")).toHaveCount(1);
});

test("AC6: adding a task with an invalid due date is refused", async ({ page }) => {
  const projectPath = await openProject(page, DUE_DATES);
  await loosenInput(page, "Due date", { type: "text" });
  expect(await addTask(page, "Bad date", "2026-02-30")).toBe(400);
  await expect(page.getByRole("alert")).toHaveText(DUE_ERROR);
  await expect(taskRow(page, "Bad date")).toHaveCount(0);
  await shot(page, "ac6a");
  await page.goto(projectPath);
  await expect(taskList(page)).toBeVisible();
  await expect(taskRow(page, "Bad date")).toHaveCount(0);
});

test("AC6: saving an invalid due date is refused", async ({ page }) => {
  const projectPath = await openProject(page, DUE_DATES);
  await openEditTask(page, "Book the venue");
  await loosenInput(page, "Due date", { type: "text" });
  expect(await saveTask(page, { due: "soon" })).toBe(400);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edit task");
  await expect(page.getByRole("alert")).toHaveText(DUE_ERROR);
  await shot(page, "ac6b");
  await page.goto(projectPath);
  await expect(taskRow(page, "Book the venue")).toContainText("Due 2099-04-01");
});

test("AC7: editing a task that doesn't exist", async ({ page }) => {
  const response = await page.goto("/tasks/999999999/edit");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Not Found")).toBeVisible();
  await shot(page, "ac7");
  const posted = await page.request.post("/tasks/999999999/edit", {
    form: { title: "Nothing", due: "" },
    maxRedirects: 0,
  });
  expect(posted.status()).toBe(404);
});

test("AC8: open tasks past their due date are marked overdue", async ({ page }) => {
  const today = utcDate(0);
  const tomorrow = utcDate(1);
  await createProject(page, OVERDUE);
  expect(await addTask(page, "File the report", "2020-01-15")).toBe(302);
  expect(await addTask(page, "Due today", today)).toBe(302);
  expect(await addTask(page, "Due tomorrow", tomorrow)).toBe(302);
  const report = taskRow(page, "File the report");
  await expect(report).toContainText("Due 2020-01-15");
  const tag = report.getByText("Overdue", { exact: true });
  await expect(tag).toBeVisible();
  await expect(tag).toHaveCSS("background-color", RED);
  for (const [title, due] of [
    ["Due today", today],
    ["Due tomorrow", tomorrow],
  ] as const) {
    const row = taskRow(page, title);
    await expect(row).toContainText(`Due ${due}`);
    await expect(row.getByText("Overdue", { exact: true })).toHaveCount(0);
  }
  await shot(page, "ac8");
});

test("AC9: a done task is not overdue", async ({ page }) => {
  await openProject(page, OVERDUE);
  await toggleTask(page, "Mark done", "File the report");
  const row = taskRow(page, "File the report");
  await expect(row.getByText("File the report", { exact: true })).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  await expect(row).toContainText("Due 2020-01-15");
  await expect(row.getByText("Overdue", { exact: true })).toHaveCount(0);
  await shot(page, "ac9a");
});

test("AC9: reopening brings the Overdue tag back", async ({ page }) => {
  await openProject(page, OVERDUE);
  await toggleTask(page, "Reopen", "File the report");
  const row = taskRow(page, "File the report");
  await expect(row.getByText("Overdue", { exact: true })).toBeVisible();
  await expect(row).toContainText("Due 2020-01-15");
  await shot(page, "ac9b");
});

const ORDERED = ["D earliest", "A sooner", "C later", "B no date", "E also no date"];

test("AC10: earliest due dates first, undated last", async ({ page }) => {
  await createProject(page, ORDER);
  for (const [title, due] of [
    ["C later", "2099-06-01"],
    ["B no date", undefined],
    ["A sooner", "2099-01-10"],
    ["D earliest", "2020-01-15"],
    ["E also no date", undefined],
  ] as const) {
    expect(await addTask(page, title, due)).toBe(302);
  }
  expect(await taskTitles(page)).toEqual(ORDERED);
  await shot(page, "ac10a");
});

test("AC10: marking a task done keeps the order", async ({ page }) => {
  await openProject(page, ORDER);
  await toggleTask(page, "Mark done", "A sooner");
  await expect(page.getByRole("button", { name: "Reopen: A sooner" })).toBeVisible();
  expect(await taskTitles(page)).toEqual(ORDERED);
  await shot(page, "ac10b");
});

test("AC11: existing tasks have no due date", async ({ page }) => {
  await openProject(page, "Team handbook");
  expect(await taskTitles(page)).toEqual([
    "Write the welcome page",
    "List the tools we use",
    "Agree on a review rota",
  ]);
  for (const title of [
    "Write the welcome page",
    "List the tools we use",
    "Agree on a review rota",
  ]) {
    const row = taskRow(page, title);
    await expect(row).not.toContainText("Due");
    await expect(row.getByText("Overdue", { exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Reopen: Agree on a review rota" })).toBeVisible();
  await shot(page, "ac11");
});
