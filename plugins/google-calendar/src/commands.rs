use crate::{calendar_api::Calendar, contacts_api::Contact, GoogleCalendarPluginExt};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GoogleAccount {
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
    pub google_id: String,
    pub calendar_access: bool,
    pub contacts_access: bool,
    pub connected_at: String, // ISO timestamp
}

#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MultiAccountStatus {
    pub connected_accounts: Vec<GoogleAccount>,
    pub total_accounts: u32,
}

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CalendarSelection {
    pub calendar_id: String,
    pub calendar_name: String,
    pub selected: bool,
    pub color: Option<String>,
}


#[tauri::command]
#[specta::specta]
pub async fn sync_calendars<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.sync_calendars().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_calendars<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<Calendar>, String> {
    app.get_calendars().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn sync_events<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    calendar_id: Option<String>,
) -> Result<(), String> {
    app.sync_events(calendar_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn sync_contacts<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.sync_contacts().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_contacts<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<Contact>, String> {
    app.get_contacts().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn search_contacts<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    query: String,
) -> Result<Vec<Contact>, String> {
    app.search_contacts(query).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn revoke_access<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.revoke_access().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn refresh_tokens<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.refresh_tokens().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_connected_accounts<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<MultiAccountStatus, String> {
    app.get_connected_accounts().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn add_google_account<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.add_google_account().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn remove_google_account<R: tauri::Runtime>(app: tauri::AppHandle<R>, email: String) -> Result<(), String> {
    app.remove_google_account(email).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_calendars_for_account<R: tauri::Runtime>(app: tauri::AppHandle<R>, email: String) -> Result<Vec<Calendar>, String> {
    app.get_calendars_for_account(email).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_contacts_for_account<R: tauri::Runtime>(app: tauri::AppHandle<R>, email: String) -> Result<Vec<Contact>, String> {
    app.get_contacts_for_account(email).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_calendar_selections<R: tauri::Runtime>(app: tauri::AppHandle<R>, email: String) -> Result<Vec<CalendarSelection>, String> {
    app.get_calendar_selections(email).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_calendar_selected<R: tauri::Runtime>(app: tauri::AppHandle<R>, email: String, calendar_id: String, selected: bool) -> Result<(), String> {
    app.set_calendar_selected(email, calendar_id, selected).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn start_worker<R: tauri::Runtime>(app: tauri::AppHandle<R>, user_id: String) -> Result<(), String> {
    app.start_worker(user_id).await
}

#[tauri::command]
#[specta::specta]
pub fn stop_worker<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_worker();
    Ok(())
}