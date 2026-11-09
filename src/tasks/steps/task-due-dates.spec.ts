import { expect, type Page, test } from "../../../.github/jim/playwright.js";
import { logInAsQaUser } from "../../../steps/log-in.js";
import { createProject, openProject } from "../../projects/steps/projects.js";
import {
  addTask,
  expectDueDate,
  expectNoDueDate,
  expectOverdue,
  expectTaskOrder,
  overdueLine,
  taskList,
  taskRow,
  toggleTask,
} from "../../projects/steps/task-list.js";
import { backToProject, openEditTask, saveDueDate } from "./edit-task.js";

// Card "Task due dates": the spec's test plan, one test per plan item, run in
// order. Later items reuse the projects earlier ones create, found by name.

const PREFIX = "jim-3750716d";
const AC1 = `${PREFIX} Due dates AC1`;
const AC5 = `${PREFIX} Due dates AC5`;
const AC7 = `${PREFIX} Due dates AC7`;
const AC9 = `${PREFIX} Due dates AC9`;
const AC10 = `${PREFIX} Due dates AC10`;
const HANDBOOK = "Team handbook";
const HANDBOOK_TASKS = [
  "Write the welcome page",
  "List the tools we use",
  "Agree on a review rota",
];

/** A UTC calendar date, `offset` days from today, as YYYY-MM-DD. */
function utcDate(offset: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: `${process.env.JIM_OUTPUT ?? "test-results"}/${name}.png`,
    fullPage: true,
  });
}

/** "<N> overdue" sits below the "New task" form's "Add task" button and above the "Tasks" list. */
async function expectOverdueLinePlacement(page: Page, text: string) {
  const line = overdueLine(page);
  await expect(line).toHaveText(text);
  const button = await page.getByRole("button", { name: "Add task" }).boundingBox();
  const lineBox = await line.boundingBox();
  const list = await taskList(page).boundingBox();
  if (!button || !lineBox || !list) throw new Error("form, overdue line or list not visible");
  expect(lineBox.y).toBeGreaterThanOrEqual(button.y + button.height);
  expect(list.y).toBeGreaterThanOrEqual(lineBox.y + lineBox.height);
  // Directly above: the list starts within a line's height of the overdue line.
  expect(list.y - (lineBox.y + lineBox.height)).toBeLessThan(lineBox.height * 2);
}

test.beforeEach(async ({ page }) => {
  await logInAsQaUser(page);
});

test("AC1: Add a task with a due date", async ({ page }) => {
  await createProject(page, AC1);
  await addTask(page, "Book the venue", "2030-01-15");
  await expectDueDate(page, "Book the venue", "2030-01-15");
  await expectOverdue(page, "Book the venue", false);
  await shot(page, "ac1");
});

test("AC2: Add a task with no due date", async ({ page }) => {
  await openProject(page, AC1);
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await addTask(page, "Order snacks");
  await expectNoDueDate(page, "Order snacks");
  await expectOverdue(page, "Order snacks", false);
  await shot(page, "ac2");
});

test("AC3: Open the Edit task page of an undated task", async ({ page }) => {
  await openProject(page, AC1);
  await openEditTask(page, "Order snacks");
  await expect(page.getByRole("main").getByText("Order snacks")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Order snacks" })).toHaveCount(0);
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(AC1) })).toBeVisible();
  await shot(page, "ac3a");
});

test("AC3: Set a due date and save", async ({ page }) => {
  const projectUrl = await openProject(page, AC1);
  await openEditTask(page, "Order snacks");
  await saveDueDate(page, "2030-02-01");
  await expect(page.getByRole("heading", { name: AC1, level: 1 })).toBeVisible();
  expect(page.url()).toBe(projectUrl);
  await expectDueDate(page, "Order snacks", "2030-02-01");
  await shot(page, "ac3b");
});

test("AC4: The Edit task page shows the current due date", async ({ page }) => {
  await openProject(page, AC1);
  await openEditTask(page, "Book the venue");
  await expect(page.getByLabel("Due date")).toHaveValue("2030-01-15");
  await shot(page, "ac4a");
});

test("AC4: Change the due date", async ({ page }) => {
  await openProject(page, AC1);
  await openEditTask(page, "Book the venue");
  await saveDueDate(page, "2030-03-01");
  await expect(page.getByRole("heading", { name: AC1, level: 1 })).toBeVisible();
  await expectDueDate(page, "Book the venue", "2030-03-01");
  await expect(taskRow(page, "Book the venue")).not.toContainText("Due 2030-01-15");
  await shot(page, "ac4b");
});

test("AC4: Remove the due date", async ({ page }) => {
  await openProject(page, AC1);
  await openEditTask(page, "Book the venue");
  await saveDueDate(page, "");
  await expect(page.getByRole("heading", { name: AC1, level: 1 })).toBeVisible();
  await expectNoDueDate(page, "Book the venue");
  await shot(page, "ac4c");
});

test("AC5: Only the task due before today is Overdue", async ({ page }) => {
  await createProject(page, AC5);
  await addTask(page, "Send the invoice", utcDate(-1));
  await addTask(page, "Due today", utcDate(0));
  await addTask(page, "Due tomorrow", utcDate(1));
  await addTask(page, "No date");
  await expectDueDate(page, "Send the invoice", utcDate(-1));
  await expectOverdue(page, "Send the invoice", true);
  await expectDueDate(page, "Due today", utcDate(0));
  await expectOverdue(page, "Due today", false);
  await expectDueDate(page, "Due tomorrow", utcDate(1));
  await expectOverdue(page, "Due tomorrow", false);
  await expectNoDueDate(page, "No date");
  await expectOverdue(page, "No date", false);
  await shot(page, "ac5");
});

test("AC6: A done task is not Overdue", async ({ page }) => {
  await openProject(page, AC5);
  await toggleTask(page, "Send the invoice", "Mark done");
  const row = taskRow(page, "Send the invoice");
  await expect(row.getByText("Send the invoice", { exact: true })).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  await expectDueDate(page, "Send the invoice", utcDate(-1));
  await expectOverdue(page, "Send the invoice", false);
  await shot(page, "ac6a");
});

test("AC6: Reopening brings the Overdue tag back", async ({ page }) => {
  await openProject(page, AC5);
  await toggleTask(page, "Send the invoice", "Reopen");
  await expectOverdue(page, "Send the invoice", true);
  await shot(page, "ac6b");
});

test("AC7: Earliest due first, undated last, ties in the order added", async ({ page }) => {
  await createProject(page, AC7);
  await addTask(page, "No date task");
  await addTask(page, "Later task", "2030-01-15");
  await addTask(page, "Sooner task", "2030-01-10");
  await addTask(page, "Also later", "2030-01-15");
  await expectTaskOrder(page, ["Sooner task", "Later task", "Also later", "No date task"]);
  await shot(page, "ac7a");
});

test("AC7: Marking a task done keeps the order", async ({ page }) => {
  await openProject(page, AC7);
  await toggleTask(page, "Later task", "Mark done");
  await expectTaskOrder(page, ["Sooner task", "Later task", "Also later", "No date task"]);
  await shot(page, "ac7b");
});

test("AC8: Team handbook's existing tasks show undated, in order, with Edit links", async ({
  page,
}) => {
  await openProject(page, HANDBOOK);
  await expectTaskOrder(page, HANDBOOK_TASKS);
  for (const title of HANDBOOK_TASKS) {
    await expectNoDueDate(page, title);
    await expectOverdue(page, title, false);
    await expect(page.getByRole("link", { name: `Edit: ${title}`, exact: true })).toBeVisible();
  }
  await shot(page, "ac8a");
});

test("AC8: Edit task for an existing task is empty; back changes nothing", async ({ page }) => {
  await openProject(page, HANDBOOK);
  await openEditTask(page, "Write the welcome page");
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await shot(page, "ac8b");
  await backToProject(page, HANDBOOK);
  await expectTaskOrder(page, HANDBOOK_TASKS);
  for (const title of HANDBOOK_TASKS) await expectNoDueDate(page, title);
  await shot(page, "ac8c");
});

test("AC9: Two overdue tasks show 2 overdue above the list", async ({ page }) => {
  await createProject(page, AC9);
  await addTask(page, "First late", utcDate(-1));
  await addTask(page, "Second late", utcDate(-2));
  await addTask(page, "Not late", utcDate(1));
  await expectOverdueLinePlacement(page, "2 overdue");
  await shot(page, "ac9a");
});

test("AC9: Marking one done shows 1 overdue", async ({ page }) => {
  await openProject(page, AC9);
  await toggleTask(page, "First late", "Mark done");
  await expect(overdueLine(page)).toHaveText("1 overdue");
  await shot(page, "ac9b");
});

test("AC9: Reopening it shows 2 overdue again", async ({ page }) => {
  await openProject(page, AC9);
  await toggleTask(page, "First late", "Reopen");
  await expect(overdueLine(page)).toHaveText("2 overdue");
  await shot(page, "ac9c");
});

test("AC10: No overdue line once both late tasks are done", async ({ page }) => {
  await openProject(page, AC9);
  await toggleTask(page, "First late", "Mark done");
  await toggleTask(page, "Second late", "Mark done");
  await expect(taskList(page)).toBeVisible();
  await expect(overdueLine(page)).toHaveCount(0);
  await shot(page, "ac10a");
});

test("AC10: No overdue line on the AC1 project", async ({ page }) => {
  await openProject(page, AC1);
  await expect(taskList(page)).toBeVisible();
  await expect(overdueLine(page)).toHaveCount(0);
  await shot(page, "ac10b");
});

test("AC10: A project with no tasks shows No tasks yet. and no overdue line", async ({ page }) => {
  await createProject(page, AC10);
  await expect(page.getByText("No tasks yet.")).toBeVisible();
  await expect(overdueLine(page)).toHaveCount(0);
  await shot(page, "ac10c");
});

test("AC10: No overdue line on Team handbook", async ({ page }) => {
  await openProject(page, HANDBOOK);
  await expect(taskList(page)).toBeVisible();
  await expect(overdueLine(page)).toHaveCount(0);
  await shot(page, "ac10d");
});
