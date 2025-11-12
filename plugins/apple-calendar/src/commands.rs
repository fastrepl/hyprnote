use crate::AppleCalendarPluginExt;
use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub fn open_calendar<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.open_calendar()
}

#[tauri::command]
#[specta::specta]
pub fn open_calendar_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_calendar_access_settings()
}

#[tauri::command]
#[specta::specta]
pub fn open_contacts_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_contacts_access_settings()
}

#[tauri::command]
#[specta::specta]
pub fn calendar_access_status<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    app.calendar_access_status()
}

#[tauri::command]
#[specta::specta]
pub fn contacts_access_status<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    app.contacts_access_status()
}

#[tauri::command]
#[specta::specta]
pub fn request_calendar_access<R: tauri::Runtime>(app: tauri::AppHandle<R>) {
    app.request_calendar_access();
}

#[tauri::command]
#[specta::specta]
pub fn request_contacts_access<R: tauri::Runtime>(app: tauri::AppHandle<R>) {
    app.request_contacts_access();
}

#[tauri::command]
#[specta::specta]
pub async fn sync_calendars<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.sync_calendars().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn sync_events<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.sync_events().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn sync_contacts<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.sync_contacts().await.map_err(|e| e.to_string())
}

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct CalDavCredentials {
    pub username: String,
    pub password: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub caldav_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carddav_url: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn set_caldav_credentials<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    credentials: CalDavCredentials,
) -> Result<(), String> {
    use tauri_plugin_auth::VaultKey;

    let vault = app.state::<tauri_plugin_auth::Vault>();

    vault
        .set(VaultKey::CalDavUsername, &credentials.username)
        .map_err(|e| e.to_string())?;
    vault
        .set(VaultKey::CalDavPassword, &credentials.password)
        .map_err(|e| e.to_string())?;

    if let Some(caldav_url) = credentials.caldav_url {
        vault
            .set(VaultKey::CalDavUrl, caldav_url)
            .map_err(|e| e.to_string())?;
    } else {
        vault
            .set(VaultKey::CalDavUrl, "https://caldav.icloud.com")
            .map_err(|e| e.to_string())?;
    }

    if let Some(carddav_url) = credentials.carddav_url {
        vault
            .set(VaultKey::CardDavUrl, carddav_url)
            .map_err(|e| e.to_string())?;
    } else {
        vault
            .set(VaultKey::CardDavUrl, "https://contacts.icloud.com")
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_caldav_credentials<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<CalDavCredentials>, String> {
    use tauri_plugin_auth::VaultKey;

    let vault = app.state::<tauri_plugin_auth::Vault>();

    let username = vault
        .get(VaultKey::CalDavUsername)
        .map_err(|e| e.to_string())?;
    let password = vault
        .get(VaultKey::CalDavPassword)
        .map_err(|e| e.to_string())?;

    if let (Some(username), Some(password)) = (username, password) {
        let caldav_url = vault
            .get(VaultKey::CalDavUrl)
            .map_err(|e| e.to_string())?;
        let carddav_url = vault
            .get(VaultKey::CardDavUrl)
            .map_err(|e| e.to_string())?;

        Ok(Some(CalDavCredentials {
            username,
            password,
            caldav_url,
            carddav_url,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
#[specta::specta]
pub async fn test_caldav_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    use tauri_plugin_auth::VaultKey;

    let vault = app.state::<tauri_plugin_auth::Vault>();

    let username = vault
        .get(VaultKey::CalDavUsername)
        .map_err(|e| e.to_string())?
        .ok_or("No username configured")?;
    let password = vault
        .get(VaultKey::CalDavPassword)
        .map_err(|e| e.to_string())?
        .ok_or("No password configured")?;
    let caldav_url = vault
        .get(VaultKey::CalDavUrl)
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "https://caldav.icloud.com".to_string());
    let carddav_url = vault
        .get(VaultKey::CardDavUrl)
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "https://contacts.icloud.com".to_string());

    // Test the connection by trying to create a handle and list calendars
    #[cfg(not(target_os = "macos"))]
    {
        use hypr_calendar_interface::CalendarSource;

        let handle = hypr_calendar_apple::caldav::CalDavHandle::with_credentials(
            caldav_url,
            username.clone(),
            password.clone(),
            carddav_url,
        )
        .map_err(|e| e.to_string())?;

        match handle.list_calendars().await {
            Ok(_) => Ok(true),
            Err(e) => Err(format!("Failed to connect: {}", e)),
        }
    }

    #[cfg(target_os = "macos")]
    {
        Ok(true) // Always succeed on macOS (uses native EventKit)
    }
}

#[tauri::command]
#[specta::specta]
pub async fn clear_caldav_credentials<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    use tauri_plugin_auth::VaultKey;

    let vault = app.state::<tauri_plugin_auth::Vault>();

    // We can't delete individual keys, so we'll just set them to empty strings
    // Actually, looking at the vault implementation, we can only clear all data
    // For now, let's set them to empty strings
    vault
        .set(VaultKey::CalDavUsername, "")
        .map_err(|e| e.to_string())?;
    vault
        .set(VaultKey::CalDavPassword, "")
        .map_err(|e| e.to_string())?;
    vault
        .set(VaultKey::CalDavUrl, "")
        .map_err(|e| e.to_string())?;
    vault
        .set(VaultKey::CardDavUrl, "")
        .map_err(|e| e.to_string())?;

    Ok(())
}
