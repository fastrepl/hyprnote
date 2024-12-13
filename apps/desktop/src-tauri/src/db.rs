use hypr_db::{
    migrations as hyprMigrations, Migration as HyprMigration, MigrationKind as HyprMigrationKind,
};
use tauri_plugin_sql::{Migration as TauriMigration, MigrationKind as TauriMigrationKind};

pub fn url() -> String {
    String::from("sqlite:hypr.db")
}

pub fn migrations() -> Vec<TauriMigration> {
    hyprMigrations()
        .into_iter()
        .map(|m: HyprMigration| TauriMigration {
            version: m.version,
            description: m.description,
            sql: m.sql,
            kind: match m.kind {
                HyprMigrationKind::Up => TauriMigrationKind::Up,
                HyprMigrationKind::Down => TauriMigrationKind::Down,
            },
        })
        .collect()
}
