import { expect, test } from "../.github/jim/playwright.js";
import { createProject, openProject, projectRow } from "../src/projects/steps/projects.js";
import { addTask, expectTaskOrder } from "../src/projects/steps/task-list.js";
import { logInAsQaUser } from "../steps/log-in.js";

// Key journey: from the Projects page, create a project, add a task to it, and
// find both again later: the project on the Projects page with one open task,
// and the task in its "Tasks" list. Projects and tasks can't be deleted, so
// each run leaves its jim-nightly- project on QA.
test("create a project and add a task to it", async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const project = `jim-nightly-${stamp} Launch`;
  const task = `jim-nightly-${stamp} Write the copy`;

  await logInAsQaUser(page);
  await createProject(page, project);
  await expectTaskOrder(page, []);

  await addTask(page, task);
  await expectTaskOrder(page, [task]);

  await page.goto("/projects");
  await expect(projectRow(page, project)).toHaveText(/\(1 open\)\s*$/);

  await openProject(page, project);
  await expectTaskOrder(page, [task]);
  await expect(page.getByRole("button", { name: `Mark done: ${task}`, exact: true })).toBeVisible();
});
