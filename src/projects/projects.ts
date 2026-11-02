import type { Db } from "../db/db.js";

export interface Project {
  id: number;
  name: string;
  open_tasks: number;
}

/** Every project on the team, newest first, with its count of open tasks. */
export function listProjects(db: Db) {
  return db.query<Project>(
    `SELECT projects.id, projects.name,
            count(tasks.id) FILTER (WHERE NOT tasks.done)::int AS open_tasks
     FROM projects LEFT JOIN tasks ON tasks.project_id = projects.id
     GROUP BY projects.id ORDER BY projects.id DESC`,
  );
}

export async function getProject(db: Db, id: number) {
  const rows = await db.query<{ id: number; name: string }>(
    "SELECT id, name FROM projects WHERE id = $1",
    [id],
  );
  return rows[0];
}

export async function createProject(db: Db, name: string, userId: number): Promise<number> {
  const rows = await db.query<{ id: number }>(
    "INSERT INTO projects (name, created_by) VALUES ($1, $2) RETURNING id",
    [name, userId],
  );
  return (rows[0] as { id: number }).id;
}
