CREATE TABLE configs (
  user_id TEXT NOT NULL,
  general TEXT NOT NULL,
  notification TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES humans(id)
);
