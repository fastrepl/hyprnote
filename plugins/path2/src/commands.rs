use crate::{ObsidianVault, Path2PluginExt};

#[tauri::command]
#[specta::specta]
pub(crate) async fn base<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.path2()
        .base()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn sanitize(name: String) -> String {
    crate::sanitize::sanitize(&name)
}

#[tauri::command]
#[specta::specta]
pub(crate) fn obsidian_vaults<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<ObsidianVault>, String> {
    app.path2().obsidian_vaults().map_err(|e| e.to_string())
}
