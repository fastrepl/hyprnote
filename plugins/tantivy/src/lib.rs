mod commands;
mod error;
mod ext;

use serde::{Deserialize, Serialize};
use tantivy::schema::Schema;
use tantivy::{Index, IndexReader, IndexWriter};
use tauri::Manager;
use tauri_plugin_notify::FileChanged;
use tauri_specta::Event;
use tokio::sync::Mutex;

pub use error::{Error, Result};
pub use ext::*;

const PLUGIN_NAME: &str = "tantivy";

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct SearchDocument {
    pub id: String,
    pub doc_type: String,
    pub language: Option<String>,
    pub title: String,
    pub content: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct SearchHit {
    pub score: f32,
    pub document: SearchDocument,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct SearchResult {
    pub hits: Vec<SearchHit>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, specta::Type)]
pub struct CreatedAtFilter {
    pub gte: Option<i64>,
    pub lte: Option<i64>,
    pub gt: Option<i64>,
    pub lt: Option<i64>,
    pub eq: Option<i64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, specta::Type)]
pub struct SearchFilters {
    pub created_at: Option<CreatedAtFilter>,
}

#[derive(Default)]
pub struct IndexStateInner {
    pub schema: Option<Schema>,
    pub index: Option<Index>,
    pub reader: Option<IndexReader>,
    pub writer: Option<IndexWriter>,
}

pub struct IndexState {
    pub inner: Mutex<IndexStateInner>,
}

impl Default for IndexState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(IndexStateInner::default()),
        }
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::search::<tauri::Wry>,
            commands::search_fuzzy::<tauri::Wry>,
            commands::reindex::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

fn setup_file_change_listener(app: &tauri::AppHandle) {
    let handle = app.clone();

    FileChanged::listen_any(app, move |event| {
        let path = &event.payload.path;

        if path.ends_with("db.sqlite") || path.ends_with("db.sqlite-wal") {
            tracing::debug!("Database file changed: {}, triggering reindex", path);

            let handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = handle.tantivy().reindex().await {
                    tracing::error!("Failed to reindex after file change: {}", e);
                }
            });
        }
    });
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            app.manage(IndexState::default());

            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = handle.tantivy().init().await {
                    tracing::error!("Failed to initialize tantivy index: {}", e);
                }
            });

            setup_file_change_listener(app);

            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        const OUTPUT_FILE: &str = "./js/bindings.gen.ts";

        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                OUTPUT_FILE,
            )
            .unwrap();

        let content = std::fs::read_to_string(OUTPUT_FILE).unwrap();
        std::fs::write(OUTPUT_FILE, format!("// @ts-nocheck\n{content}")).unwrap();
    }
}
