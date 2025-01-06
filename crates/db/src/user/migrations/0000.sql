CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  timestamp INTEGER DEFAULT (unixepoch()) NOT NULL,
  title TEXT NOT NULL,
  audio_local_path TEXT DEFAULT NULL,
  audio_remote_path TEXT DEFAULT NULL,
  tags TEXT DEFAULT NULL,
  raw_memo_html TEXT NOT NULL,
  enhanced_memo_html TEXT DEFAULT NULL,
  transcript TEXT DEFAULT NULL
);
