// Applies schema/schema.sql to the database at DATABASE_URL. Run by hand,
// once per fresh database: the app never changes its own schema.
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("set DATABASE_URL to the database to apply the schema to");

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const existing = await client.query("SELECT to_regclass('public.users') AS t");
  if (existing.rows[0]?.t) {
    console.log("The schema is already applied; nothing to do.");
  } else {
    await client.query(await readFile(new URL("../schema/schema.sql", import.meta.url), "utf8"));
    console.log("Applied schema/schema.sql.");
  }
} finally {
  await client.end();
}
