use futures_util::future::try_join_all;

use crate::ExportPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_tiptap_json_to_md<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    json: serde_json::Value,
    path: String,
) -> Result<(), String> {
    let md = app
        .export()
        .tiptap_json_to_md(json)
        .map_err(|e| e.to_string())?;

    tokio::fs::write(path, md).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_tiptap_json_to_md_batch<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    items: Vec<(serde_json::Value, String)>,
) -> Result<(), String> {
    let (jsons, paths): (Vec<_>, Vec<_>) = items.into_iter().unzip();

    let mds = app
        .export()
        .tiptap_json_to_md_batch(jsons)
        .map_err(|e| e.to_string())?;

    let write_futures: Vec<_> = mds
        .into_iter()
        .zip(paths)
        .map(|(md, path)| tokio::fs::write(path, md))
        .collect();

    try_join_all(write_futures)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
