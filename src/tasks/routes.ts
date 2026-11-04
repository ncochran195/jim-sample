import type { Hono } from "hono";
import { html } from "hono/html";
import { type Env, requireUser } from "../auth/routes.js";
import type { Db } from "../db/db.js";
import { getProject } from "../projects/projects.js";
import { projectPage } from "../projects/routes.js";
import { errorLine, page } from "../web/layout.js";
import {
  addTask,
  getTask,
  MAX_TITLE,
  parseDue,
  toggleTask,
  updateTask,
  validTitle,
} from "./tasks.js";

const TITLE_ERROR = `Give the task a title of 1 to ${MAX_TITLE} characters.`;
const DUE_ERROR = "Give the due date as a real date, or leave it empty.";

function editPage(
  task: { id: number; project_id: number },
  title: string,
  due: string,
  email: string | undefined,
  error?: string,
) {
  return page(
    "Edit task",
    html`${errorLine(error)}
      <form method="post" action="/tasks/${task.id}/edit">
        <label for="title">Title</label>
        <input id="title" name="title" type="text" value="${title}" maxlength="${MAX_TITLE}" required />
        <label for="due">Due date</label>
        <input id="due" name="due" type="date" value="${due}" />
        <button>Save</button>
      </form>
      <p><a href="/projects/${task.project_id}">Back to the project</a></p>`,
    email,
  );
}

export function taskRoutes(app: Hono<Env>, db: Db) {
  app.use("/tasks/*", requireUser);

  app.post("/projects/:id{[0-9]+}/tasks", async (c) => {
    const user = c.get("user");
    if (!user) return c.redirect("/login");
    const project = await getProject(db, Number(c.req.param("id")));
    if (!project) return c.notFound();
    const body = await c.req.parseBody();
    const title = String(body.title ?? "").trim();
    const dueText = String(body.due ?? "").trim();
    const due = parseDue(dueText);
    if (due === undefined) {
      return c.html(
        await projectPage(db, project, user.email, DUE_ERROR, { title, due: dueText }),
        400,
      );
    }
    if (validTitle(title)) await addTask(db, project.id, title, due, user.id);
    return c.redirect(`/projects/${project.id}`);
  });

  app.get("/tasks/:id{[0-9]+}/edit", async (c) => {
    const task = await getTask(db, Number(c.req.param("id")));
    if (!task) return c.notFound();
    return c.html(editPage(task, task.title, task.due_date ?? "", c.get("user")?.email));
  });

  app.post("/tasks/:id{[0-9]+}/edit", async (c) => {
    const task = await getTask(db, Number(c.req.param("id")));
    if (!task) return c.notFound();
    const body = await c.req.parseBody();
    const title = String(body.title ?? "").trim();
    const dueText = String(body.due ?? "").trim();
    const due = parseDue(dueText);
    const error = !validTitle(title) ? TITLE_ERROR : due === undefined ? DUE_ERROR : undefined;
    if (error || due === undefined) {
      return c.html(editPage(task, title, dueText, c.get("user")?.email, error), 400);
    }
    await updateTask(db, task.id, title, due);
    return c.redirect(`/projects/${task.project_id}`);
  });

  app.post("/tasks/:id{[0-9]+}/toggle", async (c) => {
    const projectId = await toggleTask(db, Number(c.req.param("id")));
    if (projectId === undefined) return c.notFound();
    return c.redirect(`/projects/${projectId}`);
  });
}
