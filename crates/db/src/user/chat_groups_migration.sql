CREATE TABLE IF NOT EXISTS chat_groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES humans(id)
);
