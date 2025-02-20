#[tauri::command]
#[specta::specta]
#[tracing::instrument]
pub fn calendar_access_status() -> bool {
    let handle = hypr_calendar::apple::Handle::new();
    handle.calendar_access_status()
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument]
pub fn contacts_access_status() -> bool {
    let handle = hypr_calendar::apple::Handle::new();
    handle.contacts_access_status()
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument]
pub fn request_calendar_access() {
    let mut handle = hypr_calendar::apple::Handle::new();
    handle.request_calendar_access();
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument]
pub fn request_contacts_access() {
    let mut handle = hypr_calendar::apple::Handle::new();
    handle.request_contacts_access();
}
