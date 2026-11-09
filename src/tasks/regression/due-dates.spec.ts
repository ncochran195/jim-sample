import { expect, test } from "../../../.github/jim/playwright.js";
import { logInAsQaUser } from "../../../steps/log-in.js";
import { createProject } from "../../projects/steps/projects.js";
import {
  addTask,
  expectDueDate,
  expectNoDueDate,
  expectOverdue,
  expectTaskOrder,
  overdueLine,
  toggleTask,
} from "../../projects/steps/task-list.js";
import { openEditTask, saveDueDate } from "../steps/edit-task.js";

// Card "Task due dates". Projects and tasks can't be deleted in the app, so
// each run leaves its uniquely named jim-nightly- project behind on QA.

const CARD = "@card-6af10ca150c8323b3750716d";

/** A UTC calendar date, `offset` days from today, as YYYY-MM-DD. */
function utcDate(offset: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function uniqueName(label: string) {
  return `jim-nightly-${label}-${Date.now()}`;
}

test.beforeEach(async ({ page }) => {
  await logInAsQaUser(page);
});

test("tasks show their due dates, earliest first and undated last, and a due date can be set, changed and cleared", {
  tag: [CARD],
}, async ({ page }) => {
  await createProject(page, uniqueName("due-dates"));

  // AC1, AC2, AC7: added with or without a due date, sorted by it.
  await addTask(page, "No date task");
  await addTask(page, "Later task", "2030-01-15");
  await addTask(page, "Sooner task", "2030-01-10");
  await addTask(page, "Also later", "2030-01-15");
  await expectDueDate(page, "Later task", "2030-01-15");
  await expectNoDueDate(page, "No date task");
  await expectTaskOrder(page, ["Sooner task", "Later task", "Also later", "No date task"]);

  // AC3: give an undated task a due date from the "Edit task" page.
  await openEditTask(page, "No date task");
  await expect(page.getByLabel("Due date")).toHaveValue("");
  await saveDueDate(page, "2030-01-01");
  await expectDueDate(page, "No date task", "2030-01-01");
  await expectTaskOrder(page, ["No date task", "Sooner task", "Later task", "Also later"]);

  // AC4: change a due date, then clear it.
  await openEditTask(page, "Sooner task");
  await expect(page.getByLabel("Due date")).toHaveValue("2030-01-10");
  await saveDueDate(page, "2030-03-01");
  await expectDueDate(page, "Sooner task", "2030-03-01");
  await openEditTask(page, "Sooner task");
  await saveDueDate(page, "");
  await expectNoDueDate(page, "Sooner task");
  await expectTaskOrder(page, ["No date task", "Later task", "Also later", "Sooner task"]);
});

test("an open task past its due date is tagged Overdue and counted above the list, until it's done", {
  tag: [CARD],
}, async ({ page }) => {
  await createProject(page, uniqueName("overdue"));

  // AC10: no tasks, no overdue line.
  await expect(page.getByText("No tasks yet.")).toBeVisible();
  await expect(overdueLine(page)).toHaveCount(0);

  // AC5: only a task due before today (UTC) is overdue.
  await addTask(page, "First late", utcDate(-1));
  await addTask(page, "Second late", utcDate(-2));
  await addTask(page, "Due today", utcDate(0));
  await addTask(page, "Not late", utcDate(1));
  await addTask(page, "No date");
  await expectOverdue(page, "First late", true);
  await expectOverdue(page, "Second late", true);
  await expectOverdue(page, "Due today", false);
  await expectOverdue(page, "Not late", false);
  await expectOverdue(page, "No date", false);

  // AC9: the count above the list.
  await expect(overdueLine(page)).toHaveText("2 overdue");

  // AC6, AC9: a done task keeps its date but isn't overdue; reopening restores it.
  await toggleTask(page, "First late", "Mark done");
  await expectDueDate(page, "First late", utcDate(-1));
  await expectOverdue(page, "First late", false);
  await expect(overdueLine(page)).toHaveText("1 overdue");
  await toggleTask(page, "First late", "Reopen");
  await expectOverdue(page, "First late", true);
  await expect(overdueLine(page)).toHaveText("2 overdue");

  // AC10: nothing overdue, no line.
  await toggleTask(page, "First late", "Mark done");
  await toggleTask(page, "Second late", "Mark done");
  await expect(overdueLine(page)).toHaveCount(0);
});
