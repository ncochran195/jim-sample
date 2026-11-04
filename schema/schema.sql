-- The sample app's reference schema. The app never changes its own schema:
-- this file is applied by hand (npm run db:schema), and a change to it is a
-- breaking change whose SQL someone runs on QA, stage and prod.

CREATE TABLE users (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token         text PRIMARY KEY,
  user_id       integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    timestamptz NOT NULL
);

CREATE TABLE projects (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  created_by    integer NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id    integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         text NOT NULL,
  done          boolean NOT NULL DEFAULT false,
  due_date      date,
  created_by    integer NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_by_project ON tasks(project_id, id);
