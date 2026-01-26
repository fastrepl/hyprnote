use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MigrationReport {
    pub from_version: String,
    pub to_version: String,
    pub migrations_applied: Vec<String>,
}
