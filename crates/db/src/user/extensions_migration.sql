CREATE TABLE IF NOT EXISTS extensions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  config TEXT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES humans(id)
);
