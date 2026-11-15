import type { Hono } from "hono";
import { html } from "hono/html";
import { type Env, requireUser } from "../auth/routes.js";
import type { Db } from "../db/db.js";
import { getProject } from "../projects/projects.js";
import { page } from "../web/layout.js";
import { addSubtask, listSubtasks, toggleSubtask } from "./subtasks.js";
import { addTask, getTask, parseDueDate, setDueDate, toggleTask } from "./tasks.js";

const MAX_TITLE = 200;

export function taskRoutes(app: Hono<Env>, db: Db) {
  app.use("/tasks/*", requireUser);
  app.use("/subtasks/*", requireUser);

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
    const subtasks = await listSubtasks(db, task.id);
    return c.html(
      page(
        "Edit task",
        html`<p class="task-title">${task.title}</p>
          <form method="post" action="/tasks/${task.id}/edit">
            <label for="due_date">Due date</label>
            <input id="due_date" name="due_date" type="date" value="${task.due_date ?? ""}" />
            <button>Save</button>
          </form>
          <h2>Subtasks</h2>
          ${
            subtasks.length === 0
              ? html`<p>No subtasks yet.</p>`
              : html`<ul aria-label="Subtasks">
                  ${subtasks.map(
                    (s) => html`<li>
                      <span class="${s.done ? "done" : ""}">${s.title}</span>
                      <form class="inline" method="post" action="/subtasks/${s.id}/toggle">
                        <button aria-label="${s.done ? "Reopen" : "Mark done"}: ${s.title}">
                          ${s.done ? "Reopen" : "Mark done"}
                        </button>
                      </form>
                    </li>`,
                  )}
                </ul>`
          }
          <form method="post" action="/tasks/${task.id}/subtasks">
            <label for="subtask_title">New subtask</label>
            <input id="subtask_title" name="title" type="text" maxlength="${MAX_TITLE}" required />
            <button>Add subtask</button>
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

  app.post("/tasks/:id{[0-9]+}/subtasks", async (c) => {
    const user = c.get("user");
    if (!user) return c.redirect("/login");
    const task = await getTask(db, Number(c.req.param("id")));
    if (!task) return c.notFound();
    const title = String((await c.req.parseBody()).title ?? "").trim();
    if (title && title.length <= MAX_TITLE) await addSubtask(db, task.id, title, user.id);
    return c.redirect(`/tasks/${task.id}/edit`);
  });

  app.post("/subtasks/:id{[0-9]+}/toggle", async (c) => {
    const taskId = await toggleSubtask(db, Number(c.req.param("id")));
    if (taskId === undefined) return c.notFound();
    return c.redirect(`/tasks/${taskId}/edit`);
  });
}
