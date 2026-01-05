use crate::{FolderPluginExt, ListFoldersResult};

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_folders<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<ListFoldersResult, String> {
    app.folder().list_folders().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn move_session<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    target_folder_path: String,
) -> Result<(), String> {
    app.folder()
        .move_session(&session_id, &target_folder_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn create_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    folder_path: String,
) -> Result<(), String> {
    app.folder()
        .create_folder(&folder_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn rename_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    app.folder()
        .rename_folder(&old_path, &new_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    folder_path: String,
) -> Result<(), String> {
    app.folder()
        .delete_folder(&folder_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn cleanup_orphan_files<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    subdir: String,
    extension: String,
    valid_ids: Vec<String>,
) -> Result<u32, String> {
    app.folder()
        .cleanup_orphan_files(&subdir, &extension, valid_ids)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn cleanup_orphan_dirs<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    subdir: String,
    marker_file: String,
    valid_ids: Vec<String>,
) -> Result<u32, String> {
    app.folder()
        .cleanup_orphan_dirs(&subdir, &marker_file, valid_ids)
        .map_err(|e| e.to_string())
}
