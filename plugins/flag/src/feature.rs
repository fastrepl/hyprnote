use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{EnumString, VariantNames};

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, EnumString, VariantNames,
)]
#[serde(rename_all = "camelCase")]
#[strum(serialize_all = "camelCase")]
pub enum Feature {
    Chat,
}

impl Feature {
    pub fn is_enabled<R: tauri::Runtime, M: tauri::Manager<R>>(&self, manager: &M) -> bool {
        match self {
            Feature::Chat => Self::is_chat_enabled(manager),
        }
    }

    fn is_chat_enabled<R: tauri::Runtime, M: tauri::Manager<R>>(_manager: &M) -> bool {
        cfg!(debug_assertions)
    }
}
