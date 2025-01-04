CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  timestamp INTEGER DEFAULT (unixepoch()) NOT NULL,
  user_id INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  api_key TEXT NOT NULL,
  UNIQUE(user_id, fingerprint),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
