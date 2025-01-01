pub fn v0() -> Vec<impl AsRef<str>> {
    vec![
        "CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER DEFAULT (unixepoch()) NOT NULL,
            title TEXT NOT NULL,
            audio_local_path TEXT DEFAULT NULL,
            audio_remote_path TEXT DEFAULT NULL,
            tags TEXT DEFAULT NULL,
            raw_memo TEXT DEFAULT NULL,
            enhanced_memo TEXT DEFAULT NULL,
            transcript TEXT DEFAULT NULL
        );",
        "CREATE TABLE calendars (
            id INTEGER PRIMARY KEY AUTOINCREMENT
        );",
        "CREATE TABLE events (
            id INTEGER PRIMARY KEY AUTOINCREMENT
        );",
    ]
}
