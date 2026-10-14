mod commands;
mod error;
mod ext;
mod query;
mod schema;
mod tokenizer;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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

pub const SCHEMA_VERSION: u32 = 2;

#[derive(Clone)]
pub struct CollectionConfig {
    pub name: String,
    pub path: String,
    pub schema_builder: fn() -> Schema,
    pub schema_version: u32,
}

pub struct CollectionIndex {
    pub schema: Schema,
    pub index: Index,
    pub reader: IndexReader,
    pub writer: IndexWriter,
}

#[derive(Default)]
pub struct IndexStateInner {
    pub collections: HashMap<String, CollectionIndex>,
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
            commands::update_documents::<tauri::Wry>,
            commands::remove_document::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

// Registration can fail transiently (e.g. a stale writer lock from a
// crashed instance); without the collection, search is dead for the whole
// process lifetime, so retry with capped backoff until it lands. Log the
// first failure loudly, then keep retries at debug level.
async fn register_with_retry<F, Fut>(attempt: F)
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<()>>,
{
    register_with_retry_delay(attempt, std::time::Duration::from_secs(5)).await
}

async fn register_with_retry_delay<F, Fut>(mut attempt: F, initial_delay: std::time::Duration)
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<()>>,
{
    let max_delay = std::time::Duration::from_secs(300);
    let mut delay = initial_delay;
    let mut logged_error = false;
    loop {
        match attempt().await {
            Ok(()) => return,
            Err(e) => {
                if logged_error {
                    tracing::debug!(
                        "Default collection still unavailable: {}; retrying in {:?}",
                        e,
                        delay
                    );
                } else {
                    tracing::error!(
                        "Failed to register default collection: {}; retrying in {:?}",
                        e,
                        delay
                    );
                    logged_error = true;
                }
                tokio::time::sleep(delay).await;
                delay = (delay * 2).min(max_delay);
            }
        }
    }
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
                    schema_version: SCHEMA_VERSION,
                };

                register_with_retry(move || {
                    let handle = handle.clone();
                    let config = config.clone();
                    async move { handle.tantivy().register_collection(config).await }
                })
                .await;
            });

            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[tokio::test]
    async fn register_retries_until_success() {
        use std::sync::atomic::{AtomicUsize, Ordering};

        let attempts = std::sync::Arc::new(AtomicUsize::new(0));
        register_with_retry_delay(
            {
                let attempts = attempts.clone();
                move || {
                    let attempts = attempts.clone();
                    async move {
                        if attempts.fetch_add(1, Ordering::SeqCst) < 2 {
                            Err(Error::IndexNotInitialized)
                        } else {
                            Ok(())
                        }
                    }
                }
            },
            std::time::Duration::from_millis(1),
        )
        .await;

        assert_eq!(attempts.load(Ordering::SeqCst), 3);
    }

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
