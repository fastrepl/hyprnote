#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_config(
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<hypr_db_user::Config, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    let user_id = guard
        .user_id
        .as_ref()
        .ok_or(crate::Error::NoneUser)
        .map_err(|e| e.to_string())?;

    let config = db.get_config(user_id).await.map_err(|e| e.to_string())?;

    match config {
        Some(config) => Ok(config),
        None => {
            let config = hypr_db_user::Config {
                id: uuid::Uuid::new_v4().to_string(),
                user_id: user_id.clone(),
                general: hypr_db_user::ConfigGeneral::default(),
                notification: hypr_db_user::ConfigNotification::default(),
                ai: hypr_db_user::ConfigAI::default(),
                audio: hypr_db_user::ConfigAudio::default(),
            };
            Ok(config)
        }
    }
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn set_config(
    state: tauri::State<'_, crate::ManagedState>,
    config: hypr_db_user::Config,
) -> Result<(), String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.set_config(config).await.map_err(|e| e.to_string())
}
