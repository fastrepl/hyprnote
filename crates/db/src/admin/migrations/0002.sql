CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  clerk_org_id TEXT DEFAULT NULL,
  clerk_user_id TEXT DEFAULT NULL,
  CHECK (
    (
      clerk_org_id IS NULL
      AND clerk_user_id IS NOT NULL
    )
    OR (
      clerk_org_id IS NOT NULL
      AND clerk_user_id IS NULL
    )
  )
);
