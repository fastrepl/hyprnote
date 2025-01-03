use tauri::{AppHandle, Manager};

use crate::App;

#[tauri::command]
#[specta::specta]
pub async fn db_list_events(app: AppHandle) -> Vec<hypr_db::user::Event> {
    let data = app.state::<App>();
    let db = data.db.clone();

    let events = db.list_events().await.unwrap();
    events
}
