use serde::{Deserialize, Serialize};
use tauri_plugin_store2::ScopedStoreKey;

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub enum TaskStatus {
    Running { step: u32, total: u32 },
    Completed,
    Failed { step: u32, error: String },
    Cancelled,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct TaskRecord {
    pub kind: String,
    pub created_at: i64,
    pub status: TaskStatus,
    pub total_steps: u32,
}

#[derive(Deserialize, specta::Type, PartialEq, Eq, Hash, strum::Display)]
pub enum StoreKey {
    Tasks,
}

impl ScopedStoreKey for StoreKey {}
