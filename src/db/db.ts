import pg from "pg";

/**
 * The thin query layer every module uses. Real Postgres on QA, stage and
 * prod; PGlite, Postgres compiled to WebAssembly, in tests and local dev.
 */
export interface Db {
  query<T>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

/**
 * Neon's URLs ask for `sslmode=require`, which today's `pg` already treats as
 * full certificate verification and the next major version will weaken. Ask
 * for `verify-full` explicitly, so the check stays strict.
 */
export function strictSsl(connectionString: string): string {
  const url = new URL(connectionString);
  if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export function postgresDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString: strictSsl(connectionString), max: 5 });
  return {
    async query<T>(sql: string, params: readonly unknown[] = []) {
      const result = await pool.query(sql, [...params]);
      return result.rows as T[];
    },
    close: () => pool.end(),
  };
}
