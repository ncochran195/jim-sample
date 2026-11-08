import type { Db } from "../db/db.js";

export interface Task {
  id: number;
  project_id: number;
  title: string;
  done: boolean;
  /** The day it's due, as YYYY-MM-DD, or null when it has none. */
  due_date: string | null;
  /** Due before today and not done; a task due today isn't overdue. */
  overdue: boolean;
  /** How many days before today it was due, when it's overdue; 0 when it isn't. */
  days_overdue: number;
}

/** How long an overdue task is overdue, for its marker's tooltip: "1 day overdue", "3 days overdue". */
export function overdueFor(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"} overdue`;
}

/**
 * A project's tasks, soonest due first and undated last. Tasks with the same
 * due date, or none, keep the order they were added in.
 */
export function listTasks(db: Db, projectId: number) {
  return db.query<Task>(
    `SELECT id, project_id, title, done,
            to_char(due_date, 'YYYY-MM-DD') AS due_date,
            (due_date < CURRENT_DATE AND NOT done) AS overdue,
            CASE WHEN due_date < CURRENT_DATE AND NOT done
                 THEN CURRENT_DATE - due_date ELSE 0 END AS days_overdue
     FROM tasks WHERE project_id = $1
     ORDER BY due_date ASC NULLS LAST, id`,
    [projectId],
  );
}

/**
 * Reads a due date from a form field: "" means none, a real calendar day as
 * YYYY-MM-DD is that day, and anything else is undefined, not a due date.
 */
export function parseDueDate(raw: string): string | null | undefined {
  const value = raw.trim();
  if (value === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const day = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value) return undefined;
  return value;
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

/** Flips a task between open and done, returning its project, if it exists. */
export async function toggleTask(db: Db, id: number): Promise<number | undefined> {
  const rows = await db.query<{ project_id: number }>(
    "UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING project_id",
    [id],
  );
  return rows[0]?.project_id;
}
