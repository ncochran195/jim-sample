import type { Hono } from "hono";
import { html } from "hono/html";
import { type Env, requireUser } from "../auth/routes.js";
import type { Db } from "../db/db.js";
import { getProject } from "../projects/projects.js";
import { page } from "../web/layout.js";
import { addTask, getTask, parseDueDate, setDueDate, toggleTask } from "./tasks.js";

const MAX_TITLE = 200;

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
    if (title && title.length <= MAX_TITLE && dueDate !== undefined) {
      await addTask(db, project.id, title, user.id, dueDate);
    }
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
    const project = await getProject(db, task.project_id);
    if (!project) return c.notFound();
    return c.html(
      page(
        "Edit task",
        html`<p class="task-title">${task.title}</p>
          <form method="post" action="/tasks/${task.id}/edit">
            <label for="due_date">Due date</label>
            <input id="due_date" name="due_date" type="date" value="${task.due_date ?? ""}" />
            <button>Save</button>
          </form>
          <p><a href="/projects/${project.id}">Back to ${project.name}</a></p>`,
        c.get("user")?.email,
      ),
    );
  });

  app.post("/tasks/:id{[0-9]+}/edit", async (c) => {
    const id = Number(c.req.param("id"));
    const task = await getTask(db, id);
    if (!task) return c.notFound();
    const dueDate = parseDueDate((await c.req.parseBody()).due_date);
    if (dueDate !== undefined) await setDueDate(db, id, dueDate);
    return c.redirect(`/projects/${task.project_id}`);
  });
}
