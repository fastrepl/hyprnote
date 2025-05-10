CREATE TABLE IF NOT EXISTS billings (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  stripe_customer TEXT NOT NULL,
  stripe_subscription TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
