import type { Db } from "../db/db.js";

export interface Task {
  id: number;
  project_id: number;
  title: string;
  done: boolean;
  /** A calendar date as `YYYY-MM-DD`, or null when the task has none. */
  due_date: string | null;
}

// The date goes out as text: the drivers would turn a `date` into a JavaScript
// Date at local midnight, which can shift the day.
const COLUMNS = "id, project_id, title, done, to_char(due_date, 'YYYY-MM-DD') AS due_date";

/** A project's tasks, by due date with undated ones last, then in the order added. */
export function listTasks(db: Db, projectId: number) {
  return db.query<Task>(
    `SELECT ${COLUMNS} FROM tasks WHERE project_id = $1 ORDER BY due_date ASC NULLS LAST, id`,
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

/** Sets a task's title and due date (null clears it). */
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

/** Today's date in UTC, as `YYYY-MM-DD`. */
export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** An open task is overdue once its due date is before today; due today is not. */
export function isOverdue(task: Pick<Task, "done" | "due_date">, today: string) {
  return !task.done && task.due_date !== null && task.due_date < today;
}

/**
 * Reads a submitted due date: empty means none (null), a real `YYYY-MM-DD`
 * date is kept, and anything else is invalid (undefined).
 */
export function parseDueDate(value: unknown): string | null | undefined {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
    ? text
    : undefined;
}
