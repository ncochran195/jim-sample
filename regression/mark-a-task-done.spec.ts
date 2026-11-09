import { expect, test } from "../.github/jim/playwright.js";
import { createProject, openProject, projectRow } from "../src/projects/steps/projects.js";
import { addTask, toggleTask } from "../src/projects/steps/task-list.js";
import { logInAsQaUser } from "../steps/log-in.js";

// Key journey: on a project's page, mark one of its tasks done. The task's
// button turns to "Reopen", it stays done after leaving the page, and the
// project's open count on the Projects page drops. Projects and tasks can't
// be deleted, so each run leaves its jim-nightly- project on QA.
test("mark a task done", async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const project = `jim-nightly-${stamp} Move office`;
  const done = `jim-nightly-${stamp} Book the van`;
  const open = `jim-nightly-${stamp} Pack the books`;

  await logInAsQaUser(page);
  await createProject(page, project);
  await addTask(page, done);
  await addTask(page, open);

  await toggleTask(page, done, "Mark done");
  await expect(page.getByRole("button", { name: `Mark done: ${open}`, exact: true })).toBeVisible();

  await page.goto("/projects");
  await expect(projectRow(page, project)).toHaveText(/\(1 open\)\s*$/);

  await openProject(page, project);
  await expect(page.getByRole("button", { name: `Reopen: ${done}`, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Mark done: ${done}`, exact: true })).toHaveCount(
    0,
  );
});
