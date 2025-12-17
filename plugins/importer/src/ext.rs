use std::future::Future;
use std::path::PathBuf;

use crate::error::Result;
use crate::sources::{ImportConfig, get_source, list_sources};
use crate::types::{ImportSourceInfo, ImportSourceKind, ImportedNote, ImportedTranscript};

pub trait ImporterPluginExt<R: tauri::Runtime> {
    fn list_import_sources(&self) -> Vec<ImportSourceInfo>;

    fn import_notes(
        &self,
        source: ImportSourceKind,
        supabase_path: Option<PathBuf>,
    ) -> impl Future<Output = Result<Vec<ImportedNote>>> + Send;

    fn import_transcripts(
        &self,
        source: ImportSourceKind,
        cache_path: Option<PathBuf>,
    ) -> impl Future<Output = Result<Vec<ImportedTranscript>>> + Send;
}

impl<R: tauri::Runtime, T: tauri::Manager<R> + Sync> ImporterPluginExt<R> for T {
    fn list_import_sources(&self) -> Vec<ImportSourceInfo> {
        list_sources()
    }

    async fn import_notes(
        &self,
        source: ImportSourceKind,
        supabase_path: Option<PathBuf>,
    ) -> Result<Vec<ImportedNote>> {
        let import_source = get_source(source);
        let config = ImportConfig {
            supabase_path,
            cache_path: None,
        };
        import_source.import_notes_boxed(config).await
    }

    async fn import_transcripts(
        &self,
        source: ImportSourceKind,
        cache_path: Option<PathBuf>,
    ) -> Result<Vec<ImportedTranscript>> {
        let import_source = get_source(source);
        let config = ImportConfig {
            supabase_path: None,
            cache_path,
        };
        import_source.import_transcripts_boxed(config).await
    }
}
