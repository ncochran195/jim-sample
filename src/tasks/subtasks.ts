import type { Db } from "../db/db.js";

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  done: boolean;
}

/** A task's subtask progress: how many of its subtasks are done, out of how many. */
export interface SubtaskProgress {
  done: number;
  total: number;
}

/** A task's subtasks, in the order added. */
export function listSubtasks(db: Db, taskId: number) {
  return db.query<Subtask>(
    "SELECT id, task_id, title, done FROM subtasks WHERE task_id = $1 ORDER BY id",
    [taskId],
  );
}

export async function addSubtask(db: Db, taskId: number, title: string, userId: number) {
  await db.query("INSERT INTO subtasks (task_id, title, created_by) VALUES ($1, $2, $3)", [
    taskId,
    title,
    userId,
  ]);
}

/** Flips a subtask between open and done, returning its task, if it exists. */
export async function toggleSubtask(db: Db, id: number): Promise<number | undefined> {
  const rows = await db.query<{ task_id: number }>(
    "UPDATE subtasks SET done = NOT done WHERE id = $1 RETURNING task_id",
    [id],
  );
  return rows[0]?.task_id;
}

/** Done/total subtask counts for each of a project's tasks that has subtasks, by task id. */
export async function subtaskProgress(
  db: Db,
  projectId: number,
): Promise<Map<number, SubtaskProgress>> {
  const rows = await db.query<{ task_id: number; done: number; total: number }>(
    `SELECT subtasks.task_id,
            count(*) FILTER (WHERE subtasks.done)::int AS done,
            count(*)::int AS total
     FROM subtasks JOIN tasks ON tasks.id = subtasks.task_id
     WHERE tasks.project_id = $1
     GROUP BY subtasks.task_id`,
    [projectId],
  );
  return new Map(rows.map((r) => [r.task_id, { done: r.done, total: r.total }]));
}

/** The project page's progress text, such as "1/3 subtasks done". */
export function progressLabel({ done, total }: SubtaskProgress) {
  return `${done}/${total} subtasks done`;
}
