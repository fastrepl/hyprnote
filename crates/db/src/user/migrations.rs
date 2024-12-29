pub fn v0() -> Vec<impl AsRef<str>> {
    vec![
        "CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audio_local_path TEXT,
            audio_remote_path TEXT
        );",
    ]
}
