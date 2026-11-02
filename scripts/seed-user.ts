// Adds a login to the database at DATABASE_URL, or resets its password if it
// exists: npm run db:seed-user -- <email> <password>
import { hashPassword } from "../src/auth/password.js";
import { normaliseEmail } from "../src/auth/users.js";
import { postgresDb } from "../src/db/db.js";

const [email, password] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url || !email || !password) {
  throw new Error("usage: DATABASE_URL=… npm run db:seed-user -- <email> <password>");
}

const db = postgresDb(url);
try {
  await db.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash`,
    [normaliseEmail(email), await hashPassword(password)],
  );
  console.log(`Seeded the login ${normaliseEmail(email)}.`);
} finally {
  await db.close();
}
