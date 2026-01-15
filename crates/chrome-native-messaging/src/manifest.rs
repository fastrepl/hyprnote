use crate::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const NATIVE_HOST_NAME: &str = "com.hyprnote.hyprnote";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeMessagingManifest {
    pub name: String,
    pub description: String,
    pub path: String,
    #[serde(rename = "type")]
    pub host_type: String,
    pub allowed_origins: Vec<String>,
}

impl NativeMessagingManifest {
    pub fn new(binary_path: &str, extension_id: Option<&str>) -> Self {
        let mut allowed_origins = vec!["chrome-extension://*/".to_string()];

        if let Some(id) = extension_id {
            allowed_origins.insert(0, format!("chrome-extension://{}/", id));
        }

        Self {
            name: NATIVE_HOST_NAME.to_string(),
            description: "Hyprnote Native Messaging Host".to_string(),
            path: binary_path.to_string(),
            host_type: "stdio".to_string(),
            allowed_origins,
        }
    }
}

#[cfg(target_os = "macos")]
pub fn get_manifest_paths() -> Vec<PathBuf> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return vec![],
    };

    vec![
        home.join("Library/Application Support/Google/Chrome/NativeMessagingHosts"),
        home.join("Library/Application Support/Google/Chrome Beta/NativeMessagingHosts"),
        home.join("Library/Application Support/Google/Chrome Canary/NativeMessagingHosts"),
        home.join("Library/Application Support/Google/Chrome Dev/NativeMessagingHosts"),
        home.join("Library/Application Support/Chromium/NativeMessagingHosts"),
        home.join("Library/Application Support/Microsoft Edge/NativeMessagingHosts"),
        home.join("Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"),
        home.join("Library/Application Support/Vivaldi/NativeMessagingHosts"),
        home.join("Library/Application Support/Arc/User Data/NativeMessagingHosts"),
    ]
}

#[cfg(target_os = "linux")]
pub fn get_manifest_paths() -> Vec<PathBuf> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return vec![],
    };

    vec![
        home.join(".config/google-chrome/NativeMessagingHosts"),
        home.join(".config/google-chrome-beta/NativeMessagingHosts"),
        home.join(".config/chromium/NativeMessagingHosts"),
        home.join(".config/microsoft-edge/NativeMessagingHosts"),
        home.join(".config/BraveSoftware/Brave-Browser/NativeMessagingHosts"),
    ]
}

#[cfg(target_os = "windows")]
pub fn get_manifest_paths() -> Vec<PathBuf> {
    vec![]
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
pub fn get_manifest_paths() -> Vec<PathBuf> {
    vec![]
}

pub fn register_native_messaging_host(binary_path: &str, extension_id: Option<&str>) -> Result<()> {
    let manifest = NativeMessagingManifest::new(binary_path, extension_id);
    let manifest_json = serde_json::to_string_pretty(&manifest)?;
    let manifest_filename = format!("{}.json", NATIVE_HOST_NAME);

    for dir in get_manifest_paths() {
        if let Err(e) = std::fs::create_dir_all(&dir) {
            tracing::debug!("Failed to create directory {:?}: {}", dir, e);
            continue;
        }

        let manifest_path = dir.join(&manifest_filename);
        if let Err(e) = std::fs::write(&manifest_path, &manifest_json) {
            tracing::debug!("Failed to write manifest to {:?}: {}", manifest_path, e);
        } else {
            tracing::info!("Registered native messaging host at {:?}", manifest_path);
        }
    }

    Ok(())
}

pub fn unregister_native_messaging_host() -> Result<()> {
    let manifest_filename = format!("{}.json", NATIVE_HOST_NAME);

    for dir in get_manifest_paths() {
        let manifest_path = dir.join(&manifest_filename);
        if manifest_path.exists() {
            if let Err(e) = std::fs::remove_file(&manifest_path) {
                tracing::debug!("Failed to remove manifest at {:?}: {}", manifest_path, e);
            } else {
                tracing::info!("Unregistered native messaging host at {:?}", manifest_path);
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_serialization() {
        let manifest = NativeMessagingManifest::new("/usr/local/bin/hyprnote-native-host", None);
        let json = serde_json::to_string_pretty(&manifest).unwrap();
        assert!(json.contains("com.hyprnote.hyprnote"));
        assert!(json.contains("stdio"));
    }
}
