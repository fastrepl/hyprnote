CREATE TABLE humans (
  id TEXT PRIMARY KEY,
  organization_id TEXT DEFAULT NULL,
  is_user BOOLEAN NOT NULL,
  name TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  job_title TEXT DEFAULT NULL,
  linkedin_url TEXT DEFAULT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations (id)
);
