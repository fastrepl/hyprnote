ALTER TABLE templates
    ADD COLUMN created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    );
