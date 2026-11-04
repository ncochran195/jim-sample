// Adds the demo project and its tasks to the database at DATABASE_URL, owned
// by an existing login, unless the project is already there:
// npm run db:seed-demo -- <email>
// QA and stage start from a database holding these, so a change can be
// checked against data that existed before it was deployed.
import { normaliseEmail } from "../src/auth/users.js";
import { postgresDb } from "../src/db/db.js";

const DEMO_PROJECT = "Team handbook";
const DEMO_TASKS: readonly { title: string; done: boolean }[] = [
  { title: "Write the welcome page", done: false },
  { title: "List the tools we use", done: false },
  { title: "Agree on a review rota", done: true },
];

const [email] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url || !email) throw new Error("usage: DATABASE_URL=… npm run db:seed-demo -- <email>");

const db = postgresDb(url);
try {
  const users = await db.query<{ id: number }>("SELECT id FROM users WHERE email = $1", [
    normaliseEmail(email),
  ]);
  const user = users[0];
  if (!user) throw new Error(`no login ${normaliseEmail(email)}: seed it with db:seed-user first`);
  const existing = await db.query("SELECT 1 FROM projects WHERE name = $1", [DEMO_PROJECT]);
  if (existing.length > 0) {
    console.log(`The demo project "${DEMO_PROJECT}" is already there; nothing to do.`);
  } else {
    const [project] = await db.query<{ id: number }>(
      "INSERT INTO projects (name, created_by) VALUES ($1, $2) RETURNING id",
      [DEMO_PROJECT, user.id],
    );
    for (const task of DEMO_TASKS) {
      await db.query(
        "INSERT INTO tasks (project_id, title, done, created_by) VALUES ($1, $2, $3, $4)",
        [project?.id, task.title, task.done, user.id],
      );
    }
    console.log(`Seeded the demo project "${DEMO_PROJECT}" with ${DEMO_TASKS.length} tasks.`);
  }
} finally {
  await db.close();
}
