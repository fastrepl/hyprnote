CREATE TABLE sessions_raw_memo_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  raw_memo_html TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
