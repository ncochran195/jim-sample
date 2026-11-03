import type { Hono } from "hono";
import { html } from "hono/html";
import { type Env, requireUser } from "../auth/routes.js";
import type { Db } from "../db/db.js";
import { getProject } from "../projects/projects.js";
import { errorLine, page } from "../web/layout.js";
import { addTask, getTask, parseDueDate, toggleTask, updateTask } from "./tasks.js";

export const MAX_TITLE = 200;

const EDIT_ERROR = `Give the task a title of 1 to ${MAX_TITLE} characters and a valid due date, or none.`;

function editPage(
  task: { id: number; project_id: number },
  title: string,
  dueDate: string,
  email: string,
  error?: string,
) {
  return page(
    "Edit task",
    html`${errorLine(error)}
      <form method="post" action="/tasks/${task.id}/edit">
        <label for="title">Title</label>
        <input id="title" name="title" type="text" value="${title}" maxlength="${MAX_TITLE}" required />
        <label for="due_date">Due date</label>
        <input id="due_date" name="due_date" type="date" value="${dueDate}" />
        <button>Save task</button>
      </form>
      <p><a href="/projects/${task.project_id}">Back to project</a></p>`,
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
    const dueDate = parseDueDate(body.due_date);
    if (dueDate === undefined) {
      return c.html(
        page(
          "Task not added",
          html`${errorLine("Give a valid due date, or none.")}
            <p><a href="/projects/${project.id}">Back to project</a></p>`,
          user.email,
        ),
        400,
      );
    }
    if (title && title.length <= MAX_TITLE) await addTask(db, project.id, title, user.id, dueDate);
    return c.redirect(`/projects/${project.id}`);
  });

  app.post("/tasks/:id{[0-9]+}/toggle", async (c) => {
    const projectId = await toggleTask(db, Number(c.req.param("id")));
    if (projectId === undefined) return c.notFound();
    return c.redirect(`/projects/${projectId}`);
  });

  app.get("/tasks/:id{[0-9]+}/edit", async (c) => {
    const task = await getTask(db, Number(c.req.param("id")));
    if (!task) return c.notFound();
    return c.html(editPage(task, task.title, task.due_date ?? "", c.get("user")?.email ?? ""));
  });

  app.post("/tasks/:id{[0-9]+}/edit", async (c) => {
    const task = await getTask(db, Number(c.req.param("id")));
    if (!task) return c.notFound();
    const body = await c.req.parseBody();
    const title = String(body.title ?? "").trim();
    const dueDate = parseDueDate(body.due_date);
    if (!title || title.length > MAX_TITLE || dueDate === undefined) {
      return c.html(
        editPage(task, title, String(body.due_date ?? ""), c.get("user")?.email ?? "", EDIT_ERROR),
        400,
      );
    }
    await updateTask(db, task.id, title, dueDate);
    return c.redirect(`/projects/${task.project_id}`);
  });
}
