import type { Db } from "../db/db.js";

export interface Task {
  id: number;
  project_id: number;
  title: string;
  done: boolean;
}

export function listTasks(db: Db, projectId: number) {
  return db.query<Task>(
    "SELECT id, project_id, title, done FROM tasks WHERE project_id = $1 ORDER BY id",
    [projectId],
  );
}

export async function addTask(db: Db, projectId: number, title: string, userId: number) {
  await db.query("INSERT INTO tasks (project_id, title, created_by) VALUES ($1, $2, $3)", [
    projectId,
    title,
    userId,
  ]);
}

/** Flips a task between open and done, returning its project, if it exists. */
export async function toggleTask(db: Db, id: number): Promise<number | undefined> {
  const rows = await db.query<{ project_id: number }>(
    "UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING project_id",
    [id],
  );
  return rows[0]?.project_id;
}
