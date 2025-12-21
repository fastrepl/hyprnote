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

#[tauri::command]
#[specta::specta]
pub async fn set_volume<R: tauri::Runtime>(app: tauri::AppHandle<R>, sfx: AppSounds, volume: f32) {
    tracing::info!(
        "sfx command: set_volume called with {:?}, volume: {}",
        sfx,
        volume
    );
    app.sfx().set_volume(sfx, volume)
}
