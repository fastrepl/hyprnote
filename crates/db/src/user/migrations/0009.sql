CREATE TABLE humans (
  id TEXT PRIMARY KEY,
  organization_id TEXT DEFAULT NULL,
  is_user BOOLEAN NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations (id)
);
