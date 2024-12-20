use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_specta::Event;

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct Transcript;

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct NotAuthenticated;

#[derive(Debug, Clone, Serialize, Deserialize, Type, Event)]
pub struct JustAuthenticated;
