CREATE TABLE calendar_events (
    id TEXT PRIMARY KEY,
    calendar_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    name TEXT NOT NULL,
    note TEXT NOT NULL,
    participants TEXT NOT NULL,
    start_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    google_event_url TEXT DEFAULT NULL,
    FOREIGN KEY (calendar_id) REFERENCES calendars(id)
);