CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  organization TEXT,
  emails TEXT NOT NULL,
  phone_numbers TEXT NOT NULL,
  note TEXT
);
