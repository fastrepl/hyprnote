CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  nango_integration_id TEXT NOT NULL,
  nango_connection_id TEXT NOT NULL,
  UNIQUE (user_id, nango_integration_id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);
