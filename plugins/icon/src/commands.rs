use crate::{IconPluginExt, IconVariant};

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_dock_icon<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    name: String,
) -> Result<(), String> {
    app.icon().set_dock_icon(name).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn reset_dock_icon<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.icon().reset_dock_icon().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_available_icons<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    is_pro: bool,
) -> Result<Vec<IconVariant>, String> {
    app.icon()
        .get_available_icons(is_pro)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn is_christmas_season() -> bool {
    crate::is_christmas_season()
}

#[tauri::command]
#[specta::specta]
pub(crate) fn is_hanukkah_season() -> bool {
    crate::is_hanukkah_season()
}

#[tauri::command]
#[specta::specta]
pub(crate) fn is_kwanzaa_season() -> bool {
    crate::is_kwanzaa_season()
}
