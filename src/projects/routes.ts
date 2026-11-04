import type { Hono } from "hono";
import { html } from "hono/html";
import { type Env, requireUser } from "../auth/routes.js";
import type { Db } from "../db/db.js";
import { isOverdue, listTasks, todayUtc } from "../tasks/tasks.js";
import { errorLine, page } from "../web/layout.js";
import { createProject, getProject, listProjects } from "./projects.js";

const MAX_NAME = 100;

async function projectsPage(db: Db, email: string, name = "", error?: string) {
  const projects = await listProjects(db);
  return page(
    "Projects",
    html`${errorLine(error)}
      <form method="post" action="/projects">
        <label for="name">New project name</label>
        <input id="name" name="name" type="text" value="${name}" maxlength="${MAX_NAME}" required />
        <button>Create project</button>
      </form>
      ${
        projects.length === 0
          ? html`<p>No projects yet.</p>`
          : html`<ul>
              ${projects.map(
                (p) =>
                  html`<li><a href="/projects/${p.id}">${p.name}</a> (${p.open_tasks} open)</li>`,
              )}
            </ul>`
      }`,
    email,
  );
}

export function projectRoutes(app: Hono<Env>, db: Db) {
  app.use("/projects", requireUser);
  app.use("/projects/*", requireUser);

  app.get("/projects", async (c) => c.html(await projectsPage(db, c.get("user")?.email ?? "")));

  app.post("/projects", async (c) => {
    const user = c.get("user");
    if (!user) return c.redirect("/login");
    const name = String((await c.req.parseBody()).name ?? "").trim();
    if (!name || name.length > MAX_NAME) {
      return c.html(
        await projectsPage(
          db,
          user.email,
          name,
          `Give the project a name of 1 to ${MAX_NAME} characters.`,
        ),
        400,
      );
    }
    return c.redirect(`/projects/${await createProject(db, name, user.id)}`);
  });

  app.get("/projects/:id{[0-9]+}", async (c) => {
    const project = await getProject(db, Number(c.req.param("id")));
    if (!project) return c.notFound();
    const tasks = await listTasks(db, project.id);
    const today = todayUtc();
    return c.html(
      page(
        project.name,
        html`<form method="post" action="/projects/${project.id}/tasks">
            <label for="title">New task</label>
            <input id="title" name="title" type="text" maxlength="200" required />
            <label for="due_date">Due date</label>
            <input id="due_date" name="due_date" type="date" />
            <button>Add task</button>
          </form>
          ${
            tasks.length === 0
              ? html`<p>No tasks yet.</p>`
              : html`<ul aria-label="Tasks">
                  ${tasks.map(
                    (t) => html`<li>
                      <span class="${t.done ? "done" : ""}">${t.title}</span>
                      ${t.due_date ? html`<span class="due">Due ${t.due_date}</span>` : ""}
                      ${isOverdue(t, today) ? html`<span class="tag error">Overdue</span>` : ""}
                      <form class="inline" method="post" action="/tasks/${t.id}/toggle">
                        <button aria-label="${t.done ? "Reopen" : "Mark done"}: ${t.title}">
                          ${t.done ? "Reopen" : "Mark done"}
                        </button>
                      </form>
                      <form class="inline" method="get" action="/tasks/${t.id}/edit">
                        <button aria-label="Edit: ${t.title}">Edit</button>
                      </form>
                    </li>`,
                  )}
                </ul>`
          }
          <p><a href="/projects">All projects</a></p>`,
        c.get("user")?.email,
      ),
    );
  });
}
