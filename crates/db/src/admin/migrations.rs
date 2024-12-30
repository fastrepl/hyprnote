pub fn v0() -> Vec<impl AsRef<str>> {
    vec![
        "CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            timestamp INTEGER DEFAULT (unixepoch()) NOT NULL,
            clerk_user_id TEXT NOT NULL,
            turso_db_name TEXT NOT NULL
        );",
        "CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);",
        "CREATE TABLE devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            timestamp INTEGER DEFAULT (unixepoch()) NOT NULL,
            user_id INTEGER NOT NULL,
            fingerprint TEXT NOT NULL,
            api_key TEXT NOT NULL,

            FOREIGN KEY (user_id) REFERENCES users(id)
        );",
        "CREATE INDEX idx_devices_api_key ON devices(api_key);",
        "CREATE UNIQUE INDEX IF NOT EXISTS devices_user_id_fingerprint ON devices(user_id, fingerprint);",
    ]
}
