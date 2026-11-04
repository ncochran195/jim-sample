import type { Db } from "../db/db.js";

export interface Task {
  id: number;
  project_id: number;
  title: string;
  done: boolean;
  /** The task's due date as YYYY-MM-DD, or null when it has none. */
  due_date: string | null;
}

export const MAX_TITLE = 200;

const COLUMNS = "id, project_id, title, done, to_char(due_date, 'YYYY-MM-DD') AS due_date";

/** A project's tasks, earliest due date first, undated tasks last, then in the order added. */
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
  due: string | null,
  userId: number,
) {
  await db.query(
    "INSERT INTO tasks (project_id, title, due_date, created_by) VALUES ($1, $2, $3, $4)",
    [projectId, title, due, userId],
  );
}

/** Sets a task's title and due date, returning its project, if it exists. */
export async function updateTask(
  db: Db,
  id: number,
  title: string,
  due: string | null,
): Promise<number | undefined> {
  const rows = await db.query<{ project_id: number }>(
    "UPDATE tasks SET title = $2, due_date = $3 WHERE id = $1 RETURNING project_id",
    [id, title, due],
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

export function validTitle(title: string) {
  return title.length >= 1 && title.length <= MAX_TITLE;
}

/**
 * Reads a submitted due date: null when empty, the date when it's a real
 * calendar date as YYYY-MM-DD, or undefined when it's anything else.
 */
export function parseDue(value: string): string | null | undefined {
  if (value === "") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > (days[month - 1] as number)) {
    return undefined;
  }
  return value;
}

/** Today's date in UTC as YYYY-MM-DD. */
export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** An open task is overdue when its due date is before today; done tasks never are. */
export function isOverdue(task: Pick<Task, "done" | "due_date">, today: string) {
  return !task.done && task.due_date !== null && task.due_date < today;
}
