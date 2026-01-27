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
        false
    }
}

pub struct Flag<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Flag<'a, R, M> {
    pub fn is_enabled(&self, feature: Feature) -> bool {
        feature.is_enabled(self.manager)
    }
}

pub trait FlagPluginExt<R: tauri::Runtime> {
    fn flag(&self) -> Flag<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> FlagPluginExt<R> for T {
    fn flag(&self) -> Flag<'_, R, Self>
    where
        Self: Sized,
    {
        Flag {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
