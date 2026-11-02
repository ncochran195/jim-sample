import pg from "pg";

/**
 * The thin query layer every module uses. Real Postgres on QA, stage and
 * prod; PGlite, Postgres compiled to WebAssembly, in tests and local dev.
 */
export interface Db {
  query<T>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

export function postgresDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 5 });
  return {
    async query<T>(sql: string, params: readonly unknown[] = []) {
      const result = await pool.query(sql, [...params]);
      return result.rows as T[];
    },
    close: () => pool.end(),
  };
}
