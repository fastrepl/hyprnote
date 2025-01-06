CREATE TABLE event_participants (
  event_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  PRIMARY KEY (event_id, participant_id),
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);
