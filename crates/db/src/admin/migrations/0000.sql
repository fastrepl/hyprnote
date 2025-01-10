CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  timestamp TEXT NOT NULL,
  clerk_org_id TEXT DEFAULT NULL,
  clerk_user_id TEXT NOT NULL UNIQUE,
  turso_db_name TEXT NOT NULL,
  CHECK (
    (
      clerk_org_id IS NULL
      AND clerk_user_id IS NOT NULL
    )
    OR (
      clerk_org_id IS NOT NULL
      AND clerk_user_id IS NULL
    )
  )
);
