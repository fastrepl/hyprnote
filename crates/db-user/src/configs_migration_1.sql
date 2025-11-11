-- Migration to add audio column
-- Note: This migration is idempotent when run through the migration system
ALTER TABLE
  configs
ADD
  COLUMN audio TEXT NOT NULL DEFAULT '{}';
