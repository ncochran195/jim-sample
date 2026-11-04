# Schema (`schema/`)

`schema.sql` is the reference Postgres schema. The app never changes its own schema. The file is applied by hand to a fresh database (`npm run db:schema`), and `memoryDb` applies it to PGlite in tests and local runs. Any change to it is a breaking change, so its SQL is run by hand on QA, stage and prod.

Tables:

- `users` (`email` unique, `password_hash`)
- `sessions` (`token`, `user_id`, `expires_at`)
- `projects` (`name`, `created_by`)
- `tasks` (`project_id` cascade-deletes with its project, `title`, `done` default false, `due_date date` nullable, `created_by`, `created_at`), indexed on `(project_id, id)`

`tasks.due_date` is a calendar date with no time. `NULL` means no due date, and tasks from before it was added have `NULL`.
