pub fn v0() -> Vec<impl AsRef<str>> {
    vec!["CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, password TEXT)"]
}
