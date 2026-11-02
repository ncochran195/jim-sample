import { Hono } from "hono";
import { authRoutes, type Env, loadUser } from "./auth/routes.js";
import type { Db } from "./db/db.js";
import { projectRoutes } from "./projects/routes.js";
import { taskRoutes } from "./tasks/routes.js";

export interface AppOptions {
  /** Mark the session cookie Secure, as on QA, stage and prod behind HTTPS. */
  secureCookies?: boolean;
}

export function createApp(db: Db, options: AppOptions = {}) {
  const app = new Hono<Env>();

  app.get("/health", async (c) => {
    await db.query("SELECT 1");
    return c.text("ok");
  });

  app.use("*", loadUser(db));
  app.get("/", (c) => c.redirect(c.get("user") ? "/projects" : "/login"));

  authRoutes(app, db, options.secureCookies ?? false);
  projectRoutes(app, db);
  taskRoutes(app, db);

  return app;
}
