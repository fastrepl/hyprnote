CREATE TABLE tags (
  id TEXT NOT NULL PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
