CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  human_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  clerk_user_id TEXT NOT NULL UNIQUE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
