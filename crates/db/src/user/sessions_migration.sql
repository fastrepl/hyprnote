CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  calendar_event_id TEXT DEFAULT NULL,
  title TEXT NOT NULL,
  audio_local_path TEXT DEFAULT NULL,
  audio_remote_path TEXT DEFAULT NULL,
  raw_memo_html TEXT NOT NULL,
  enhanced_memo_html TEXT DEFAULT NULL,
  conversations TEXT NOT NULL,
  FOREIGN KEY (calendar_event_id) REFERENCES events(id)
);
