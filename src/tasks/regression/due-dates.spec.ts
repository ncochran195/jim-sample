import { expect, test } from "../../../.github/jim/playwright.js";
import { logInAsQaUser } from "../../../steps/log-in.js";
import { createProject } from "../../projects/steps/create-project.js";
import { readTasks, taskItem } from "../../projects/steps/read-tasks.js";
import { addTask } from "../steps/add-task.js";
import { openEditTask, saveTask } from "../steps/edit-task.js";
import { markDone, reopen } from "../steps/toggle-task.js";

// The app can't delete projects or tasks, so each run leaves its project
// behind on QA; names carry a per-run suffix so runs never share data.
const run = `jim-nightly-${Date.now().toString(36)}`;

test.beforeEach(async ({ page }) => {
  await logInAsQaUser(page);
});

test("tasks show their due dates, sorted earliest first with undated last, and open past-due tasks are Overdue", {
  tag: ["@card-6aea949bf6b2951eee424c50"],
}, async ({ page }) => {
  await createProject(page, `${run} due dates`);
  const undated = `${run} No date`;
  const later = `${run} Later`;
  const past = `${run} Long ago`;
  await addTask(page, undated);
  await addTask(page, later, "2099-06-01");
  await addTask(page, past, "2020-01-15");

  expect(await readTasks(page)).toEqual([
    { title: past, due: "2020-01-15", overdue: true, done: false },
    { title: later, due: "2099-06-01", overdue: false, done: false },
    { title: undated, due: null, overdue: false, done: false },
  ]);
  await expect(taskItem(page, undated)).not.toContainText("Due");

  await markDone(page, past);
  expect((await readTasks(page)).map((t) => [t.title, t.overdue])).toEqual([
    [past, false],
    [later, false],
    [undated, false],
  ]);

  await reopen(page, past);
  await expect(taskItem(page, past).getByText("Overdue", { exact: true })).toBeVisible();
});

test("a task's title and due date can be set, changed and cleared on its Edit task page", {
  tag: ["@card-6aea949bf6b2951eee424c50"],
}, async ({ page }) => {
  const path = await createProject(page, `${run} edit task`);
  const title = `${run} Order snacks`;
  const renamed = `${run} Order snacks and drinks`;
  await addTask(page, title);

  await openEditTask(page, title);
  await saveTask(page, { dueDate: "2099-05-20" });
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(taskItem(page, title)).toContainText("Due 2099-05-20");

  await openEditTask(page, title);
  await expect(page.getByLabel("Title")).toHaveValue(title);
  await expect(page.getByLabel("Due date")).toHaveValue("2099-05-20");
  await saveTask(page, { title: renamed, dueDate: "2099-04-10" });
  await expect(taskItem(page, renamed)).toContainText("Due 2099-04-10");
  await expect(taskItem(page, title)).toHaveCount(0);

  await openEditTask(page, renamed);
  await saveTask(page, { dueDate: "" });
  await expect(taskItem(page, renamed)).toBeVisible();
  await expect(taskItem(page, renamed)).not.toContainText("Due");
});
