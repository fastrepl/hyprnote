use tauri::State;

use crate::App;

#[tauri::command]
#[specta::specta]
pub async fn db_list_calendars(state: State<'_, App>) -> Result<Vec<hypr_db::user::Calendar>, ()> {
    Ok(state.db.list_calendars().await.unwrap())
}

#[tauri::command]
#[specta::specta]
pub async fn db_list_events(state: State<'_, App>) -> Result<Vec<hypr_db::user::Event>, ()> {
    Ok(state.db.list_events().await.unwrap())
}

#[tauri::command]
#[specta::specta]
pub async fn db_list_sessions(
    state: State<'_, App>,
    search: Option<&str>,
) -> Result<Vec<hypr_db::user::Session>, ()> {
    Ok(state.db.list_sessions(search).await.unwrap())
}

#[tauri::command]
#[specta::specta]
pub async fn db_list_participants(
    state: State<'_, App>,
    search: Option<&str>,
) -> Result<Vec<hypr_db::user::Participant>, ()> {
    Ok(state.db.list_participants(search).await.unwrap())
}

#[tauri::command]
#[specta::specta]
pub async fn db_upsert_participant(
    state: State<'_, App>,
    participant: hypr_db::user::Participant,
) -> Result<hypr_db::user::Participant, ()> {
    Ok(state.db.upsert_participant(participant).await.unwrap())
}
