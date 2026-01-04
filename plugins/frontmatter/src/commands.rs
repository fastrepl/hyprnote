use rayon::prelude::*;

use crate::FrontmatterPluginExt;

macro_rules! spawn_blocking {
    ($body:expr) => {
        tokio::task::spawn_blocking(move || $body)
            .await
            .map_err(|e| e.to_string())?
    };
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn deserialize<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    input: String,
) -> Result<crate::ParsedDocument, String> {
    app.frontmatter()
        .deserialize(input)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn serialize<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    doc: crate::ParsedDocument,
) -> Result<String, String> {
    app.frontmatter().serialize(doc).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn serialize_batch(
    items: Vec<(crate::ParsedDocument, String)>,
) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(doc, path)| {
            let frontmatter_yaml: std::collections::HashMap<String, serde_yaml::Value> = doc
                .frontmatter
                .into_iter()
                .map(|(k, v)| {
                    let yaml_value = serde_yaml::to_value(&v).unwrap_or(serde_yaml::Value::Null);
                    (k, yaml_value)
                })
                .collect();

            let doc = hypr_frontmatter::Document::new(frontmatter_yaml, doc.content);
            let content = doc.render().map_err(|e| e.to_string())?;
            std::fs::write(path, content).map_err(|e| e.to_string())
        })
    })
}
