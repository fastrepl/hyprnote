use std::path::Path;

use tauri_plugin_path2::Path2PluginExt;

pub use tauri_plugin_folder::{is_uuid, migrate_all_uuid_folders, migrate_session_to_default};

pub fn migrate_uuid_folders<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let base = match app.path2().base() {
        Ok(base) => base,
        Err(e) => {
            tracing::warn!("Failed to get base path for migration: {}", e);
            return;
        }
    };

    let sessions_dir = base.join("sessions");
    if !sessions_dir.exists() {
        return;
    }

    migrate_all_uuid_folders(&sessions_dir);
}

pub fn maybe_migrate_path(base: &Path, relative_path: &str) {
    let parts: Vec<&str> = relative_path.split('/').collect();

    if parts.len() != 2 || parts[0] != "sessions" {
        return;
    }

    let folder_name = parts[1];
    if !is_uuid(folder_name) {
        return;
    }

    let sessions_dir = base.join("sessions");
    migrate_session_to_default(&sessions_dir, folder_name);
}
