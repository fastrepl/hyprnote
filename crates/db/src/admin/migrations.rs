pub fn v0() -> Vec<impl AsRef<str>> {
    vec![
        "CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT,
            updated_at TEXT,
            clerk_user_id TEXT,
            turso_db_name TEXT
        );",
        "CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);",
        "CREATE TABLE devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT,
            updated_at TEXT,
            user_id INTEGER,
            fingerprint TEXT,
            api_key TEXT,

            FOREIGN KEY (user_id) REFERENCES users(id)
        );",
        "CREATE INDEX idx_devices_api_key ON devices(api_key);",
    ]
}
