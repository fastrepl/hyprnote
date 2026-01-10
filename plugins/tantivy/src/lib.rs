mod commands;
mod error;
mod ext;
mod query;
mod schema;
mod tokenizer;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use tantivy::schema::Schema;
use tantivy::{Index, IndexReader, IndexWriter};
use tauri::Manager;
use tokio::sync::RwLock;

pub use error::{Error, Result};
pub use ext::*;
pub use schema::build_schema;
pub use tokenizer::get_tokenizer_name_for_language;

const PLUGIN_NAME: &str = "tantivy";

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct SearchDocument {
    pub id: String,
    pub doc_type: String,
    pub language: Option<String>,
    pub title: String,
    pub content: String,
    pub created_at: i64,
    #[serde(default)]
    pub facets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct Snippet {
    pub fragment: String,
    pub highlights: Vec<HighlightRange>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct HighlightRange {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct SearchHit {
    pub score: f32,
    pub document: SearchDocument,
    pub title_snippet: Option<Snippet>,
    pub content_snippet: Option<Snippet>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct SearchResult {
    pub hits: Vec<SearchHit>,
    pub count: usize,
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
    pub doc_type: Option<String>,
    pub facet: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, specta::Type)]
pub struct SearchOptions {
    pub fuzzy: Option<bool>,
    pub distance: Option<u8>,
    pub snippets: Option<bool>,
    pub snippet_max_chars: Option<usize>,
    pub phrase_slop: Option<u32>,
}

fn default_limit() -> usize {
    100
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct SearchRequest {
    pub query: String,
    #[serde(default)]
    pub collection: Option<String>,
    #[serde(default)]
    pub filters: SearchFilters,
    #[serde(default = "default_limit")]
    pub limit: usize,
    #[serde(default)]
    pub options: SearchOptions,
}

pub const SCHEMA_VERSION: u32 = 1;

pub struct CollectionConfig {
    pub name: String,
    pub path: String,
    pub schema_builder: fn() -> Schema,
    pub auto_commit: bool,
    pub commit_interval_ms: u64,
    pub schema_version: u32,
}

pub struct CollectionIndex {
    pub schema: Schema,
    pub index: Index,
    pub reader: IndexReader,
    pub writer: IndexWriter,
    pub auto_commit: bool,
    pub commit_interval_ms: u64,
    pub pending_writes: AtomicU64,
    pub last_commit: std::sync::Mutex<Instant>,
}

pub struct IndexStateInner {
    pub collections: HashMap<String, CollectionIndex>,
}

impl Default for IndexStateInner {
    fn default() -> Self {
        Self {
            collections: HashMap::new(),
        }
    }
}

pub struct IndexState {
    pub inner: RwLock<IndexStateInner>,
}

impl Default for IndexState {
    fn default() -> Self {
        Self {
            inner: RwLock::new(IndexStateInner::default()),
        }
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::search::<tauri::Wry>,
            commands::reindex::<tauri::Wry>,
            commands::add_document::<tauri::Wry>,
            commands::update_document::<tauri::Wry>,
            commands::remove_document::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            app.manage(IndexState::default());

            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                let config = CollectionConfig {
                    name: "default".to_string(),
                    path: "search_index".to_string(),
                    schema_builder: schema::build_schema,
                    auto_commit: true,
                    commit_interval_ms: 1000,
                    schema_version: SCHEMA_VERSION,
                };

                if let Err(e) = handle.tantivy().register_collection(config).await {
                    tracing::error!("Failed to register default collection: {}", e);
                }
            });

            Ok(())
        })
        .on_event(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let state = app.state::<IndexState>();
                if let Ok(mut guard) = state.inner.try_write() {
                    for (name, collection) in guard.collections.iter_mut() {
                        let pending = collection.pending_writes.load(Ordering::SeqCst);
                        if pending > 0 {
                            if let Err(e) = collection.writer.commit() {
                                tracing::error!(
                                    "Failed to flush pending writes for collection '{}': {}",
                                    name,
                                    e
                                );
                            } else {
                                tracing::info!(
                                    "Flushed {} pending writes for collection '{}' on exit",
                                    pending,
                                    name
                                );
                            }
                        }
                    }
                }
            }
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
