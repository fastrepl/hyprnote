use crate::{LocationConnectivityState, LocationEventType, LocationStatus};
use tauri::{AppHandle, State};

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_current_ssid(
    state: State<'_, LocationConnectivityState<tauri::Wry>>,
) -> Result<Option<String>, String> {
    state.get_current_ssid().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_trusted_ssids(
    app: AppHandle<tauri::Wry>,
) -> Result<Vec<String>, String> {
    crate::store::get_trusted_ssids(app).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn add_trusted_ssid(
    app: AppHandle<tauri::Wry>,
    state: State<'_, LocationConnectivityState<tauri::Wry>>,
    ssid: String,
) -> Result<(), String> {
    if ssid.trim().is_empty() {
        return Err("SSID cannot be empty".to_string());
    }
    
    crate::store::add_trusted_ssid(app, ssid).await.map_err(|e| e.to_string())?;
    
    // Update location status after adding trusted SSID
    state.update_location_status().await.map_err(|e| e.to_string())?;
    
    // Emit settings changed event
    let status = state.get_location_status().await.map_err(|e| e.to_string())?;
    state.emit_location_event(LocationEventType::SettingsChanged, &status).await;
    
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn remove_trusted_ssid(
    app: AppHandle<tauri::Wry>,
    state: State<'_, LocationConnectivityState<tauri::Wry>>,
    ssid: String,
) -> Result<(), String> {
    if ssid.trim().is_empty() {
        return Err("SSID cannot be empty".to_string());
    }
    
    crate::store::remove_trusted_ssid(app, ssid).await.map_err(|e| e.to_string())?;
    
    // Update location status after removing trusted SSID
    state.update_location_status().await.map_err(|e| e.to_string())?;
    
    // Emit settings changed event
    let status = state.get_location_status().await.map_err(|e| e.to_string())?;
    state.emit_location_event(LocationEventType::SettingsChanged, &status).await;
    
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn is_location_based_enabled(
    app: AppHandle<tauri::Wry>,
) -> Result<bool, String> {
    crate::store::get_location_based_enabled(app).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_location_based_enabled(
    app: AppHandle<tauri::Wry>,
    state: State<'_, LocationConnectivityState<tauri::Wry>>,
    enabled: bool,
) -> Result<(), String> {
    crate::store::set_location_based_enabled(app, enabled).map_err(|e| e.to_string())?;
    
    // Update location status after changing setting
    state.update_location_status().await.map_err(|e| e.to_string())?;
    
    // Emit settings changed event
    let status = state.get_location_status().await.map_err(|e| e.to_string())?;
    state.emit_location_event(LocationEventType::SettingsChanged, &status).await;
    
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn is_in_trusted_location(
    state: State<'_, LocationConnectivityState<tauri::Wry>>,
) -> Result<bool, String> {
    let status = state.get_location_status().await.map_err(|e| e.to_string())?;
    Ok(status.is_in_trusted_location)
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_location_status(
    state: State<'_, LocationConnectivityState<tauri::Wry>>,
) -> Result<LocationStatus, String> {
    state.get_location_status().await.map_err(|e| e.to_string())
}