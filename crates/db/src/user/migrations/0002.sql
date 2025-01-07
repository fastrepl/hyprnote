CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE,
  calendar_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  note TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  google_event_url TEXT DEFAULT NULL,
  FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE
);
