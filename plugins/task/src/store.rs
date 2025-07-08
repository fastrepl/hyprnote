use serde::{Deserialize, Serialize};
use tauri_plugin_store2::ScopedStoreKey;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum TaskStatus {
    Running { current: u32, total: u32 },
    Completed,
    Failed { error: String },
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub struct TaskRecord {
    pub id: String,
    pub status: TaskStatus,
    #[specta(type = String)]
    pub data: std::collections::HashMap<u32, serde_json::Value>,
}

impl Default for TaskRecord {
    fn default() -> Self {
        Self {
            id: String::new(),
            status: TaskStatus::Running {
                current: 0,
                total: 1,
            },
            data: std::collections::HashMap::new(),
        }
    }
}

#[derive(Deserialize, specta::Type, PartialEq, Eq, Hash, strum::Display)]
pub enum StoreKey {
    Tasks(String),
}

impl ScopedStoreKey for StoreKey {}
