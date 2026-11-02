# jim-sample

A small team task tracker that JIM, the Joint Intelligence Machine, builds on during its live runs. Everyone signed in sees every project; a project holds tasks you can add and mark done.

- **Stack:** Node 26, TypeScript, [Hono](https://hono.dev) rendering plain HTML forms, Postgres through a thin query layer (`src/db/db.ts`).
- **Modules:** `src/auth` (sign up, log in, sessions), `src/projects`, `src/tasks`.
- **Environments:** QA and stage are always-on Fly.io apps, each on its own Neon Postgres branch.

## Running it

```sh
npm ci
npm run dev        # http://localhost:8080 on an in-memory PGlite database
```

Set `DATABASE_URL` to run against real Postgres; production refuses to start without it.

## Tests

Every test is self-contained: no database or other service has to be running.

| Script | Runs |
| --- | --- |
| `npm run lint` | Biome and the TypeScript type check |
| `npm test` | Vitest unit and integration tests, the integration tests on PGlite |
| `npm run test:feature` | Playwright feature tests (the `feature` project), against the app started on `PORT` (default 3100) with an in-memory database. Needs `npx playwright install chromium` once |

## The database

The app never changes its own schema. `schema/schema.sql` is the reference schema, applied by hand to a fresh database:

```sh
DATABASE_URL=… npm run db:schema
DATABASE_URL=… npm run db:seed-user -- <email> <password>
```

A schema change is a breaking change: its SQL is run by hand on QA, stage and prod, and `schema/schema.sql` is updated to match.

## Deploying

```sh
flyctl deploy --app <app>
```

`fly.toml` is shared by the QA and stage apps. Each app's `DATABASE_URL` is a Fly secret.
