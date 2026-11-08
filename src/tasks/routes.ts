import type { Hono } from "hono";
import { type Env, requireUser } from "../auth/routes.js";
import type { Db } from "../db/db.js";
import { getProject } from "../projects/projects.js";
import { addTask, parseDueDate, toggleTask } from "./tasks.js";

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
    const dueDate = parseDueDate(String(body.due_date ?? ""));
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
}
