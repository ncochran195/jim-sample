# Schema (`schema/`)

## Purpose

`schema/schema.sql` is the reference Postgres schema. The app never changes its own schema: the file is applied by hand to a fresh database (`npm run db:schema`), and `src/db/memory.ts` applies it to the in-memory PGlite database used by tests and local runs. Any change to it is a breaking change whose SQL someone runs by hand on QA, stage and prod.

## Tables

- `users`: `id`, `email` (unique), `password_hash`, `created_at`.
- `sessions`: `token` (primary key), `user_id` (cascade-deleted with the user), `expires_at`.
- `projects`: `id`, `name`, `created_by`, `created_at`.
- `tasks`: `id`, `project_id` (cascade-deleted with the project), `title`, `done` (default false), `due_date` (nullable `date`, no default: a calendar date with no time, null meaning no due date), `created_by`, `created_at`. Index `tasks_by_project` on `(project_id, id)`.

## Applying changes to existing databases

The `tasks.due_date` column was added after QA, stage and prod were created; existing databases need:

```sql
ALTER TABLE tasks ADD COLUMN due_date date;
```

Existing rows get null, so tasks from before the change have no due date.
