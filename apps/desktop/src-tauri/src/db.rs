pub use hypr_db_client::export_ts_types_to;
pub use hypr_db_client::ops::*;
pub use hypr_db_client::types::*;

use hypr_db_client::{
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
