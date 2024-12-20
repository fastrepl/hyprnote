use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;
use tauri_specta::Event;

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct Transcript {
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct NotAuthenticated;

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct JustAuthenticated;

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct RecordingStarted;

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct RecordingStopped {
    path: PathBuf,
}
