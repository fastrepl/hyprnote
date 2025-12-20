use crate::{AppSounds, SfxPluginExt};

#[tauri::command]
#[specta::specta]
pub async fn play<R: tauri::Runtime>(app: tauri::AppHandle<R>, sfx: AppSounds) {
    tracing::info!("sfx command: play called with {:?}", sfx);
    app.sfx().play(sfx)
}

#[tauri::command]
#[specta::specta]
pub async fn stop<R: tauri::Runtime>(app: tauri::AppHandle<R>, sfx: AppSounds) {
    tracing::info!("sfx command: stop called with {:?}", sfx);
    app.sfx().stop(sfx)
}
