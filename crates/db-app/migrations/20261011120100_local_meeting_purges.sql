-- Crash-recoverable local meeting purge ledger, never synced.
CREATE TABLE local_meeting_purges (
 meeting_id TEXT PRIMARY KEY NOT NULL,
 export_sha256 TEXT NOT NULL DEFAULT '',
 paths_json TEXT NOT NULL DEFAULT '[]'
) STRICT;
