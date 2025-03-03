CREATE TABLE IF NOT EXISTS billings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  stripe_customer TEXT NOT NULL,
  stripe_subscription TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
