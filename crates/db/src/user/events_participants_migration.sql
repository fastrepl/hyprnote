CREATE TABLE events_participants (
  event_id TEXT NOT NULL,
  human_id TEXT NOT NULL,
  PRIMARY KEY (event_id, human_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (human_id) REFERENCES humans(id) ON DELETE CASCADE
);
