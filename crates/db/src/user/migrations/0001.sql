CREATE TABLE calendars (
  id TEXT PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  name TEXT NOT NULL
);
