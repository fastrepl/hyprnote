use crate::LocationConnectivityError;
use strum::{Display, EnumString};
use tauri_plugin_store2::{ScopedStoreKey, StorePluginExt};

#[derive(Display, EnumString, Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[strum(serialize_all = "snake_case")]
pub enum StoreKey {
    LocationBasedEnabled,
    TrustedSsids,
}

impl ScopedStoreKey for StoreKey {}

pub fn get_location_based_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, LocationConnectivityError> {
    let store = app.scoped_store::<StoreKey>("location-connectivity")?;
    Ok(store.get::<bool>(StoreKey::LocationBasedEnabled)?.unwrap_or(false))
}

pub fn set_location_based_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), LocationConnectivityError> {
    let store = app.scoped_store::<StoreKey>("location-connectivity")?;
    store.set(StoreKey::LocationBasedEnabled, enabled)?;
    store.save()?;
    Ok(())
}

pub fn get_trusted_ssids<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, LocationConnectivityError> {
    let store = app.scoped_store::<StoreKey>("location-connectivity")?;
    Ok(store.get::<Vec<String>>(StoreKey::TrustedSsids)?.unwrap_or_default())
}

pub fn set_trusted_ssids<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    ssids: Vec<String>,
) -> Result<(), LocationConnectivityError> {
    let store = app.scoped_store::<StoreKey>("location-connectivity")?;
    store.set(StoreKey::TrustedSsids, ssids)?;
    store.save()?;
    Ok(())
}

pub async fn add_trusted_ssid<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    ssid: String,
) -> Result<(), LocationConnectivityError> {
    let mut ssids = get_trusted_ssids(app.clone())?;
    
    if !ssids.contains(&ssid) {
        ssids.push(ssid);
        set_trusted_ssids(app, ssids)?;
    }
    
    Ok(())
}

pub async fn remove_trusted_ssid<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    ssid: String,
) -> Result<(), LocationConnectivityError> {
    let mut ssids = get_trusted_ssids(app.clone())?;
    ssids.retain(|s| s != &ssid);
    set_trusted_ssids(app, ssids)?;
    Ok(())
}