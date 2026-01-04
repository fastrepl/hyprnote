use frontmatter::Document;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// For many small files with frequent writes, sync I/O with rayon parallelism
/// is more efficient than async I/O (avoids per-file async task overhead).
/// This macro wraps sync work to prevent blocking Tauri's invoke handler.
macro_rules! spawn_blocking {
    ($body:expr) => {
        tokio::task::spawn_blocking(move || $body)
            .await
            .map_err(|e| e.to_string())?
    };
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ParsedFrontmatter {
    pub frontmatter: HashMap<String, Value>,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct FrontmatterInput {
    pub frontmatter: HashMap<String, Value>,
    pub content: String,
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_json(json: Value, path: String) -> Result<(), String> {
    spawn_blocking!({
        let content = crate::json::serialize(json)?;
        std::fs::write(path, content).map_err(|e| e.to_string())
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_json_batch(items: Vec<(Value, String)>) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(json, path)| {
            let content = crate::json::serialize(json)?;
            std::fs::write(path, content).map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_tiptap_json_to_md(
    json: serde_json::Value,
    path: String,
) -> Result<(), String> {
    spawn_blocking!({
        let md = crate::tiptap_json_to_md(&json).map_err(|e| e.to_string())?;
        std::fs::write(path, md).map_err(|e| e.to_string())
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_tiptap_json_to_md_batch(
    items: Vec<(serde_json::Value, String)>,
) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(json, path)| {
            let md = crate::tiptap_json_to_md(&json).map_err(|e| e.to_string())?;
            std::fs::write(path, md).map_err(|e| e.to_string())
        })
    })
}

/// Parse markdown with YAML frontmatter into structured data.
/// Returns frontmatter as a HashMap and the content body.
/// If the markdown has no frontmatter, returns empty frontmatter and the full content as body.
#[tauri::command]
#[specta::specta]
pub(crate) async fn parse_frontmatter(markdown: String) -> Result<ParsedFrontmatter, String> {
    spawn_blocking!({
        match Document::<HashMap<String, Value>>::from_str(&markdown) {
            Ok(doc) => Ok(ParsedFrontmatter {
                frontmatter: doc.frontmatter,
                content: doc.content,
            }),
            Err(frontmatter::Error::MissingOpeningDelimiter)
            | Err(frontmatter::Error::MissingClosingDelimiter) => {
                // No frontmatter, treat entire content as body
                Ok(ParsedFrontmatter {
                    frontmatter: HashMap::new(),
                    content: markdown,
                })
            }
            Err(e) => Err(e.to_string()),
        }
    })
}

/// Serialize frontmatter and content into markdown with YAML frontmatter.
#[tauri::command]
#[specta::specta]
pub(crate) async fn serialize_frontmatter(input: FrontmatterInput) -> Result<String, String> {
    spawn_blocking!({
        let doc = Document::new(input.frontmatter, input.content);
        doc.to_string().map_err(|e| e.to_string())
    })
}

/// Write markdown with frontmatter to a file.
#[tauri::command]
#[specta::specta]
pub(crate) async fn export_frontmatter(
    input: FrontmatterInput,
    path: String,
) -> Result<(), String> {
    spawn_blocking!({
        let doc = Document::new(input.frontmatter, input.content);
        let content = doc.to_string().map_err(|e| e.to_string())?;
        std::fs::write(path, content).map_err(|e| e.to_string())
    })
}

/// Batch write multiple markdown files with frontmatter.
#[tauri::command]
#[specta::specta]
pub(crate) async fn export_frontmatter_batch(
    items: Vec<(FrontmatterInput, String)>,
) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(input, path)| {
            let doc = Document::new(input.frontmatter, input.content);
            let content = doc.to_string().map_err(|e| e.to_string())?;
            std::fs::write(path, content).map_err(|e| e.to_string())
        })
    })
}
