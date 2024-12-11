use tauri_plugin_sql::{Migration, MigrationKind};

pub fn url() -> String {
    String::from("sqlite:hypr.db")
}

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: r#"
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    name TEXT
                );
            "#,
        kind: MigrationKind::Up,
    }]
}
