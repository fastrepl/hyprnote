CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  turso_db_name TEXT NOT NULL,
  clerk_org_id TEXT DEFAULT NULL
);
