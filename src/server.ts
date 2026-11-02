import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { type Db, postgresDb } from "./db/db.js";

const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 8080);
const databaseUrl = process.env.DATABASE_URL;

let db: Db;
if (databaseUrl) {
  db = postgresDb(databaseUrl);
} else if (production) {
  throw new Error("DATABASE_URL must be set in production");
} else {
  const { memoryDb } = await import("./db/memory.js");
  db = await memoryDb();
  console.log("No DATABASE_URL: using an in-memory PGlite database");
}

const app = createApp(db, { secureCookies: production });
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Listening on port ${info.port}`);
});
