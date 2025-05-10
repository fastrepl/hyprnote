use crate::{MembershipPluginExt, Subscription};

#[tauri::command]
#[specta::specta]
pub(crate) async fn refresh<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Subscription, String> {
    app.refresh().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_subscription<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<Subscription>, String> {
    app.get_subscription().await.map_err(|e| e.to_string())
}
