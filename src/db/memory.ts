import { readFile } from "node:fs/promises";
import type { Db } from "./db.js";

const SCHEMA = new URL("../../schema/schema.sql", import.meta.url);

/**
 * An in-memory database with the reference schema applied, for tests and
 * local runs. PGlite is a dev dependency, so production never loads it.
 */
export async function memoryDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pglite = new PGlite();
  await pglite.exec(await readFile(SCHEMA, "utf8"));
  return {
    async query<T>(sql: string, params: readonly unknown[] = []) {
      const result = await pglite.query<T>(sql, [...params]);
      return result.rows;
    },
    close: () => pglite.close(),
  };
}
