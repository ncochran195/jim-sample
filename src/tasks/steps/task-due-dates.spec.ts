import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "../../../.github/jim/playwright.js";
import { logInAsQaUser } from "../../../steps/log-in.js";
import { createProject } from "../../projects/steps/create-project.js";
import { openProject, openProjectFromList } from "../../projects/steps/open-project.js";
import { readTasks, taskItem } from "../../projects/steps/read-tasks.js";
import { addTask } from "./add-task.js";
import { openEditTask, saveTask } from "./edit-task.js";
import { markDone, reopen } from "./toggle-task.js";

// Card "Task due dates". The plan items build on each other in order, on
// projects created by AC1 and AC7; their paths are kept in a state file so a
// failed item doesn't lose them when Playwright restarts the worker.
test.describe.configure({ mode: "default" });

const P = "jim-ee424c50 ";
const DUE_PROJECT = `${P}Due dates QA`;
const ORDER_PROJECT = `${P}Ordering QA`;
const BOOK = `${P}Book the venue`;
const SNACKS = `${P}Order snacks`;
const SNACKS_DRINKS = `${P}Order snacks and drinks`;
const RENEW = `${P}Renew the domain`;
const TODAY_TASK = `${P}Due today`;
const ERROR_COLOUR = "rgb(176, 0, 32)"; // #b00020

const output = process.env.JIM_OUTPUT ?? "test-results";
const stateFile = join(tmpdir(), "jim-ee424c50-state.json");

type State = { dueProject?: string; orderProject?: string };
function loadState(): State {
  try {
    return JSON.parse(readFileSync(stateFile, "utf8")) as State;
  } catch {
    return {};
  }
}
function saveState(change: State): void {
  writeFileSync(stateFile, JSON.stringify({ ...loadState(), ...change }));
}
function project(key: keyof State): string {
  const path = loadState()[key];
  if (!path) throw new Error(`The ${key} project wasn't created by an earlier plan item`);
  return path;
}
async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(output, { recursive: true });
  await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
}
async function titles(page: Page): Promise<string[]> {
  return (await readTasks(page)).map((t) => t.title);
}
async function task(page: Page, title: string) {
  const found = (await readTasks(page)).find((t) => t.title === title);
  if (!found) throw new Error(`"${title}" isn't in the Tasks list`);
  return found;
}

test.beforeEach(async ({ page }) => {
  await logInAsQaUser(page);
});

test("AC1: Add a task with a due date", async ({ page }) => {
  writeFileSync(stateFile, "{}");
  const path = await createProject(page, DUE_PROJECT);
  saveState({ dueProject: path });
  await addTask(page, BOOK, "2099-03-01");
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(taskItem(page, BOOK)).toContainText("Due 2099-03-01");
  expect(await task(page, BOOK)).toMatchObject({ due: "2099-03-01", overdue: false });
  await shot(page, "ac1");
});

test("AC2: Add a task without a due date", async ({ page }) => {
  await openProject(page, project("dueProject"));
  await addTask(page, SNACKS);
  await expect(taskItem(page, SNACKS)).toBeVisible();
  await expect(taskItem(page, SNACKS)).not.toContainText("Due");
  expect(await task(page, SNACKS)).toMatchObject({ due: null, overdue: false });
  await shot(page, "ac2");
});

test("AC3: Give an existing task a due date", async ({ page }) => {
  const path = project("dueProject");
  await openProject(page, path);
  await openEditTask(page, SNACKS);
  await saveTask(page, { dueDate: "2099-05-20" });
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(taskItem(page, SNACKS)).toContainText("Due 2099-05-20");
  await shot(page, "ac3");
});

test("AC4: Edit task page holds the title and due date", async ({ page }) => {
  await openProject(page, project("dueProject"));
  await openEditTask(page, BOOK);
  await expect(page.getByLabel("Title")).toHaveValue(BOOK);
  await expect(page.getByLabel("Due date")).toHaveValue("2099-03-01");
  await shot(page, "ac4-1");
});

test("AC4: Change the due date", async ({ page }) => {
  await openProject(page, project("dueProject"));
  await openEditTask(page, BOOK);
  await saveTask(page, { dueDate: "2099-04-10" });
  await expect(taskItem(page, BOOK)).toContainText("Due 2099-04-10");
  await shot(page, "ac4-2");
});

test("AC4: Clear the due date", async ({ page }) => {
  await openProject(page, project("dueProject"));
  await openEditTask(page, BOOK);
  await saveTask(page, { dueDate: "" });
  await expect(taskItem(page, BOOK)).toBeVisible();
  await expect(taskItem(page, BOOK)).not.toContainText("Due");
  expect(await task(page, BOOK)).toMatchObject({ due: null, overdue: false });
  await shot(page, "ac4-3");
});

test("AC5: A past due date shows a red Overdue tag", async ({ page }) => {
  await openProject(page, project("dueProject"));
  await addTask(page, RENEW, "2020-01-15");
  await expect(taskItem(page, RENEW)).toContainText("Due 2020-01-15");
  const tag = taskItem(page, RENEW).getByText("Overdue", { exact: true });
  await expect(tag).toBeVisible();
  await expect(tag).toHaveCSS("color", ERROR_COLOUR);
  await shot(page, "ac5");
});

test("AC6: A task due today is not overdue", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  await openProject(page, project("dueProject"));
  await addTask(page, TODAY_TASK, today);
  await expect(taskItem(page, TODAY_TASK)).toContainText(`Due ${today}`);
  expect(await task(page, TODAY_TASK)).toMatchObject({ due: today, overdue: false });
  await shot(page, "ac6-1");
});

test("AC6: A done task is not overdue", async ({ page }) => {
  await openProject(page, project("dueProject"));
  await markDone(page, RENEW);
  await expect(taskItem(page, RENEW).getByText(RENEW, { exact: true })).toHaveClass(/\bdone\b/);
  expect(await task(page, RENEW)).toMatchObject({ done: true, overdue: false });
  expect(await task(page, SNACKS)).toMatchObject({ due: "2099-05-20", overdue: false });
  expect(await task(page, TODAY_TASK)).toMatchObject({ overdue: false });
  await shot(page, "ac6-2");
});

test("AC6: Reopening shows the Overdue tag again", async ({ page }) => {
  await openProject(page, project("dueProject"));
  await reopen(page, RENEW);
  await expect(taskItem(page, RENEW).getByText("Overdue", { exact: true })).toBeVisible();
  expect(await task(page, RENEW)).toMatchObject({ done: false, overdue: true });
  await shot(page, "ac6-3");
});

const ordered = (names: string[]) => names.map((n) => `${P}${n}`);

test("AC7: Tasks are ordered by due date, undated last", async ({ page }) => {
  const path = await createProject(page, ORDER_PROJECT);
  saveState({ orderProject: path });
  await addTask(page, `${P}No date A`);
  await addTask(page, `${P}Later`, "2099-06-01");
  await addTask(page, `${P}Sooner`, "2099-02-01");
  await addTask(page, `${P}No date B`);
  await addTask(page, `${P}Long ago`, "2020-01-15");
  expect(await titles(page)).toEqual(
    ordered(["Long ago", "Sooner", "Later", "No date A", "No date B"]),
  );
  await shot(page, "ac7-1");
});

test("AC7: Marking a task done keeps the order", async ({ page }) => {
  await openProject(page, project("orderProject"));
  await markDone(page, `${P}Sooner`);
  expect(await titles(page)).toEqual(
    ordered(["Long ago", "Sooner", "Later", "No date A", "No date B"]),
  );
  await shot(page, "ac7-2");
});

test("AC7: Giving an undated task a date moves it into place", async ({ page }) => {
  await openProject(page, project("orderProject"));
  await openEditTask(page, `${P}No date B`);
  await saveTask(page, { dueDate: "2099-01-01" });
  expect(await titles(page)).toEqual(
    ordered(["Long ago", "No date B", "Sooner", "Later", "No date A"]),
  );
  await shot(page, "ac7-3");
});

test("AC8: Tasks from before the change have no due date", async ({ page }) => {
  await openProjectFromList(page, "Team handbook");
  const tasks = await readTasks(page);
  expect(tasks.map((t) => t.title)).toEqual([
    "Write the welcome page",
    "List the tools we use",
    "Agree on a review rota",
  ]);
  for (const t of tasks) {
    expect(t, t.title).toMatchObject({ due: null, overdue: false });
    await expect(page.getByRole("button", { name: `Edit: ${t.title}`, exact: true })).toBeVisible();
    await expect(taskItem(page, t.title)).not.toContainText("Due");
  }
  await expect(page.getByText("Agree on a review rota", { exact: true })).toHaveClass(/\bdone\b/);
  expect(tasks.map((t) => t.done)).toEqual([false, false, true]);
  await shot(page, "ac8");
});

test("AC9: Editing a task that doesn't exist answers 404", async ({ page }) => {
  const response = await page.goto("/tasks/999999999/edit");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("404 Not Found")).toBeVisible();
  await shot(page, "ac9");
});

test("AC10: Change a task's title", async ({ page }) => {
  const path = project("dueProject");
  await openProject(page, path);
  const before = await titles(page);
  await openEditTask(page, SNACKS);
  await saveTask(page, { title: SNACKS_DRINKS });
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(taskItem(page, SNACKS_DRINKS)).toContainText("Due 2099-05-20");
  await expect(taskItem(page, SNACKS)).toHaveCount(0);
  expect(await titles(page)).toEqual(before.map((t) => (t === SNACKS ? SNACKS_DRINKS : t)));
  await shot(page, "ac10-1");
});

test("AC10: A blank title is refused", async ({ page }) => {
  const path = project("dueProject");
  await openProject(page, path);
  await openEditTask(page, SNACKS_DRINKS);
  await saveTask(page, { title: "   ", bypassRequired: true });
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(taskItem(page, SNACKS_DRINKS)).toContainText("Due 2099-05-20");
  expect(await task(page, SNACKS_DRINKS)).toMatchObject({ due: "2099-05-20" });
  await shot(page, "ac10-2");
});
