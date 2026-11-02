import { randomBytes } from "node:crypto";
import type { Db } from "../db/db.js";
import { hashPassword, verifyPassword } from "./password.js";

export interface User {
  id: number;
  email: string;
}

const SESSION_DAYS = 30;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(db: Db, email: string) {
  const rows = await db.query<User & { password_hash: string }>(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [normaliseEmail(email)],
  );
  return rows[0];
}

export async function createUser(db: Db, email: string, password: string): Promise<User> {
  const rows = await db.query<User>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
    [normaliseEmail(email), await hashPassword(password)],
  );
  return rows[0] as User;
}

/** The user for an email and password, or undefined if either is wrong. */
export async function authenticate(db: Db, email: string, password: string) {
  const user = await findUserByEmail(db, email);
  if (!user || !(await verifyPassword(password, user.password_hash))) return undefined;
  return { id: user.id, email: user.email };
}

export async function startSession(db: Db, userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.query(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [token, userId, SESSION_DAYS],
  );
  return token;
}

export async function userForSession(db: Db, token: string): Promise<User | undefined> {
  const rows = await db.query<User>(
    `SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = $1 AND sessions.expires_at > now()`,
    [token],
  );
  return rows[0];
}

export async function endSession(db: Db, token: string): Promise<void> {
  await db.query("DELETE FROM sessions WHERE token = $1", [token]);
}
