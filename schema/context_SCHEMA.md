# Schema

`schema.sql` is the app's reference Postgres schema. The app never changes its own schema: the file is applied by hand to a fresh database (`npm run db:schema`), and the in-memory PGlite database used in tests and local runs (`src/db/memory.ts`) applies it on start.

Any change to it is a breaking change: its SQL is run by hand on QA, stage and prod, and this file is updated to match.

## Tables

- `users`: `id`, unique `email`, `password_hash`, `created_at`.
- `sessions`: `token` (primary key), `user_id` (cascade-deleted with the user), `expires_at`.
- `projects`: `id`, `name`, `created_by`, `created_at`.
- `tasks`: `id`, `project_id` (cascade-deleted with the project), `title`, `done` (default false), `due_date` (nullable `date`; NULL means no due date), `created_by`, `created_at`. Index `tasks_by_project` on `(project_id, id)`.
