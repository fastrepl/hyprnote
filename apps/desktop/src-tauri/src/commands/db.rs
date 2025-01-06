use tauri::State;

use crate::App;

#[tauri::command]
#[specta::specta]
pub async fn db_list_events(state: State<'_, App>) -> Result<Vec<hypr_db::user::Event>, ()> {
    Ok(state.db.list_events().await.unwrap())
}

#[tauri::command]
#[specta::specta]
pub async fn db_list_sessions(state: State<'_, App>) -> Result<Vec<hypr_db::user::Session>, ()> {
    Ok(state.db.list_sessions().await.unwrap())
}
