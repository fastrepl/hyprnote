ALTER TABLE calendars 
ADD COLUMN connection_status TEXT DEFAULT 'connected';

ALTER TABLE calendars
ADD COLUMN account_id TEXT;

ALTER TABLE calendars
ADD COLUMN last_sync_error TEXT;

ALTER TABLE calendars
ADD COLUMN last_sync_at TEXT;
