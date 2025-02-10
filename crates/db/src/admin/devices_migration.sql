CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY NOT NULL,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  api_key TEXT NOT NULL,
  UNIQUE(user_id, fingerprint),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
