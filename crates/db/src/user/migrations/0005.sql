CREATE TABLE integrations (
  id TEXT PRIMARY KEY NOT NULL,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nango_integration_id TEXT NOT NULL,
  nango_connection_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
