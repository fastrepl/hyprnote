CREATE TABLE IF NOT EXISTS extension_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  config_schema TEXT NOT NULL
);
