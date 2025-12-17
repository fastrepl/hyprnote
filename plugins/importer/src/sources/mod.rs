mod granola;

pub use granola::GranolaSource;

use crate::error::Result;
use crate::types::{ImportSourceInfo, ImportSourceKind, ImportedNote, ImportedTranscript};
use std::future::Future;
use std::path::PathBuf;

pub trait ImportSource: Send + Sync {
    fn info(&self) -> ImportSourceInfo;

    fn import_notes(
        &self,
        config: ImportConfig,
    ) -> impl Future<Output = Result<Vec<ImportedNote>>> + Send;

    fn import_transcripts(
        &self,
        config: ImportConfig,
    ) -> impl Future<Output = Result<Vec<ImportedTranscript>>> + Send;
}

#[derive(Debug, Clone)]
pub struct ImportConfig {
    pub supabase_path: Option<PathBuf>,
    pub cache_path: Option<PathBuf>,
}

impl Default for ImportConfig {
    fn default() -> Self {
        Self {
            supabase_path: None,
            cache_path: None,
        }
    }
}

pub fn get_source(kind: ImportSourceKind) -> Box<dyn ImportSourceDyn> {
    match kind {
        ImportSourceKind::Granola => Box::new(GranolaSource),
    }
}

pub fn list_sources() -> Vec<ImportSourceInfo> {
    vec![ImportSource::info(&GranolaSource)]
}

pub trait ImportSourceDyn: Send + Sync {
    fn info(&self) -> ImportSourceInfo;
    fn import_notes_boxed(
        &self,
        config: ImportConfig,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedNote>>> + Send + '_>>;
    fn import_transcripts_boxed(
        &self,
        config: ImportConfig,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedTranscript>>> + Send + '_>>;
}

impl<T: ImportSource> ImportSourceDyn for T {
    fn info(&self) -> ImportSourceInfo {
        ImportSource::info(self)
    }

    fn import_notes_boxed(
        &self,
        config: ImportConfig,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedNote>>> + Send + '_>> {
        Box::pin(self.import_notes(config))
    }

    fn import_transcripts_boxed(
        &self,
        config: ImportConfig,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedTranscript>>> + Send + '_>> {
        Box::pin(self.import_transcripts(config))
    }
}
