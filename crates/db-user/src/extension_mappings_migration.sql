CREATE TABLE IF NOT EXISTS extension_mappings (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config TEXT NOT NULL,
  widget_layout_mapping TEXT DEFAULT '{}' NOT NULL,
  FOREIGN KEY (user_id) REFERENCES humans(id),
  FOREIGN KEY (extension_id) REFERENCES extensions(id)
);
