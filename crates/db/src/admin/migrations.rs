pub fn v0() -> Vec<impl AsRef<str>> {
    vec![
        "CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT,
            updated_at TEXT,
            clerk_user_id TEXT,
            turso_db_name TEXT
        );",
        "CREATE TABLE devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT,
            updated_at TEXT,
            user_id INTEGER,
            fingerprint TEXT,
            api_key TEXT,

            FOREIGN KEY (user_id) REFERENCES users(id)
        );",
    ]
}
