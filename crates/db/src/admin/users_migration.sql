CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  human_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  clerk_user_id TEXT NOT NULL UNIQUE,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
