CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  timestamp TEXT NOT NULL,
  clerk_org_id TEXT DEFAULT NULL,
  clerk_user_id TEXT NOT NULL UNIQUE,
  turso_db_name TEXT NOT NULL
);
