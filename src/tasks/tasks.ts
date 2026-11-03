import type { Db } from "../db/db.js";

export interface Task {
  id: number;
  project_id: number;
  title: string;
  done: boolean;
  /** The task's due date as `YYYY-MM-DD`, or null for none. */
  due_date: string | null;
  /** Open and due before today (UTC). */
  overdue: boolean;
}

// Dates leave the database as text, so no time zone ever shifts them.
const COLUMNS = `id, project_id, title, done,
  to_char(due_date, 'YYYY-MM-DD') AS due_date,
  (NOT done AND due_date IS NOT NULL
    AND due_date < (now() AT TIME ZONE 'UTC')::date) AS overdue`;

/**
 * Parses a submitted due date: a real calendar date in `YYYY-MM-DD` form.
 * Blank or missing means no due date (null); anything else is invalid (undefined).
 */
export function parseDueDate(value: unknown): string | null | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  if (value === undefined || text === "") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    year >= 1 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return real ? text : undefined;
}

/** A project's tasks, earliest due first, undated last, then in the order they were added. */
export function listTasks(db: Db, projectId: number) {
  return db.query<Task>(
    `SELECT ${COLUMNS} FROM tasks WHERE project_id = $1
     ORDER BY due_date ASC NULLS LAST, id`,
    [projectId],
  );
}

export async function getTask(db: Db, id: number): Promise<Task | undefined> {
  const rows = await db.query<Task>(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [id]);
  return rows[0];
}

export async function addTask(
  db: Db,
  projectId: number,
  title: string,
  userId: number,
  dueDate: string | null = null,
) {
  await db.query(
    "INSERT INTO tasks (project_id, title, created_by, due_date) VALUES ($1, $2, $3, $4)",
    [projectId, title, userId, dueDate],
  );
}

/** Saves a task's title and due date, leaving its done state as it is. */
export async function updateTask(db: Db, id: number, title: string, dueDate: string | null) {
  await db.query("UPDATE tasks SET title = $2, due_date = $3 WHERE id = $1", [id, title, dueDate]);
}

/** Flips a task between open and done, returning its project, if it exists. */
export async function toggleTask(db: Db, id: number): Promise<number | undefined> {
  const rows = await db.query<{ project_id: number }>(
    "UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING project_id",
    [id],
  );
  return rows[0]?.project_id;
}
