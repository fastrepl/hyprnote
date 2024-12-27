pub fn v0() -> Vec<String> {
    vec![
        "CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, password TEXT)"
            .to_string(),
    ]
}
