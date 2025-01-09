CREATE TABLE billings (
  id TEXT PRIMARY KEY NOT NULL,
  stripe_customer TEXT DEFAULT NULL,
  stripe_subscription TEXT DEFAULT NULL
);
