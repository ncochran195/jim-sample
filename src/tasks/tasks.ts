import type { Db } from "../db/db.js";

export interface Task {
  id: number;
  project_id: number;
  title: string;
  done: boolean;
  /** The due date as YYYY-MM-DD, or null when the task has none. */
  due_date: string | null;
  /** Open, with a due date before today in UTC. */
  overdue: boolean;
  /** Whole days from the due date to today in UTC when overdue, otherwise null. */
  days_overdue: number | null;
}

/**
 * Columns every task query returns. The due date is formatted in SQL so it
 * never passes through a JavaScript Date and its time zone; "today" is the
 * UTC calendar date, the time zone the apps run in.
 */
const TODAY = "(now() AT TIME ZONE 'UTC')::date";
const TASK_COLUMNS = `id, project_id, title, done,
  to_char(due_date, 'YYYY-MM-DD') AS due_date,
  (NOT done AND due_date < ${TODAY}) AS overdue,
  CASE WHEN NOT done AND due_date < ${TODAY} THEN ${TODAY} - due_date END AS days_overdue`;

/** The "Overdue" tag's tooltip, such as "1 day overdue" or "3 days overdue". */
export function overdueLabel(days: number) {
  return `${days} ${days === 1 ? "day" : "days"} overdue`;
}

/** A project's tasks, earliest due date first, undated last, ties in the order added. */
export function listTasks(db: Db, projectId: number) {
  return db.query<Task>(
    `SELECT ${TASK_COLUMNS} FROM tasks WHERE project_id = $1
     ORDER BY due_date ASC NULLS LAST, id`,
    [projectId],
  );
}

export async function getTask(db: Db, id: number): Promise<Task | undefined> {
  const rows = await db.query<Task>(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = $1`, [id]);
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

/** Sets or clears a task's due date, returning its project, if it exists. */
export async function setDueDate(
  db: Db,
  id: number,
  dueDate: string | null,
): Promise<number | undefined> {
  const rows = await db.query<{ project_id: number }>(
    "UPDATE tasks SET due_date = $2 WHERE id = $1 RETURNING project_id",
    [id, dueDate],
  );
  return rows[0]?.project_id;
}

/** Flips a task between open and done, returning its project, if it exists. */
export async function toggleTask(db: Db, id: number): Promise<number | undefined> {
  const rows = await db.query<{ project_id: number }>(
    "UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING project_id",
    [id],
  );
  return rows[0]?.project_id;
}

/**
 * Reads a submitted "Due date" field: null when empty, the date when it is a
 * real YYYY-MM-DD calendar date, and undefined when it is anything else.
 */
export function parseDueDate(value: unknown): string | null | undefined {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  // Postgres's date type has no year 0, though JavaScript's Date accepts it.
  if (Number(text.slice(0, 4)) < 1) return undefined;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return undefined;
  return text;
}
