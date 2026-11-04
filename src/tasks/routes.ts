import type { Hono } from "hono";
import { html } from "hono/html";
import { type Env, requireUser } from "../auth/routes.js";
import type { Db } from "../db/db.js";
import { getProject } from "../projects/projects.js";
import { page } from "../web/layout.js";
import { addTask, getTask, parseDueDate, toggleTask, updateTask } from "./tasks.js";

const MAX_TITLE = 200;

/** A submitted title, trimmed, or undefined when it's empty or too long. */
function parseTitle(value: unknown): string | undefined {
  const title = String(value ?? "").trim();
  return title && title.length <= MAX_TITLE ? title : undefined;
}

export function taskRoutes(app: Hono<Env>, db: Db) {
  app.use("/tasks/*", requireUser);

  app.post("/projects/:id{[0-9]+}/tasks", async (c) => {
    const user = c.get("user");
    if (!user) return c.redirect("/login");
    const project = await getProject(db, Number(c.req.param("id")));
    if (!project) return c.notFound();
    const body = await c.req.parseBody();
    const title = parseTitle(body.title);
    const dueDate = parseDueDate(body.due_date);
    if (title !== undefined && dueDate !== undefined) {
      await addTask(db, project.id, title, user.id, dueDate);
    }
    return c.redirect(`/projects/${project.id}`);
  });

  app.get("/tasks/:id{[0-9]+}/edit", async (c) => {
    const task = await getTask(db, Number(c.req.param("id")));
    if (!task) return c.notFound();
    return c.html(
      page(
        "Edit task",
        html`<form method="post" action="/tasks/${task.id}/edit">
            <label for="title">Title</label>
            <input id="title" name="title" type="text" value="${task.title}" maxlength="${MAX_TITLE}" required />
            <label for="due_date">Due date</label>
            <input id="due_date" name="due_date" type="date" value="${task.due_date ?? ""}" />
            <button>Save</button>
          </form>
          <p><a href="/projects/${task.project_id}">Back to the project</a></p>`,
        c.get("user")?.email,
      ),
    );
  });

  app.post("/tasks/:id{[0-9]+}/edit", async (c) => {
    const task = await getTask(db, Number(c.req.param("id")));
    if (!task) return c.notFound();
    const body = await c.req.parseBody();
    const title = parseTitle(body.title);
    const dueDate = parseDueDate(body.due_date);
    if (title !== undefined && dueDate !== undefined) {
      await updateTask(db, task.id, title, dueDate);
    }
    return c.redirect(`/projects/${task.project_id}`);
  });

  app.post("/tasks/:id{[0-9]+}/toggle", async (c) => {
    const projectId = await toggleTask(db, Number(c.req.param("id")));
    if (projectId === undefined) return c.notFound();
    return c.redirect(`/projects/${projectId}`);
  });
}
