mod granola;
mod hyprnote;
mod noop;

pub use granola::GranolaSource;
pub use hyprnote::{HyprnoteV0NightlySource, HyprnoteV0StableSource};
pub use noop::NoOpSource;

use crate::error::Result;
use crate::types::{
    ImportSourceInfo, ImportSourceKind, ImportedHuman, ImportedNote, ImportedOrganization,
    ImportedSessionParticipant, ImportedTranscript,
};
use std::future::Future;
use std::path::PathBuf;

pub trait ImportSource: Send + Sync {
    fn info(&self) -> ImportSourceInfo;
    fn is_available(&self) -> bool;

    fn import_notes(&self) -> impl Future<Output = Result<Vec<ImportedNote>>> + Send;

    fn import_transcripts(&self) -> impl Future<Output = Result<Vec<ImportedTranscript>>> + Send;

    fn import_humans(&self) -> impl Future<Output = Result<Vec<ImportedHuman>>> + Send;

    fn import_organizations(
        &self,
    ) -> impl Future<Output = Result<Vec<ImportedOrganization>>> + Send;

    fn import_session_participants(
        &self,
    ) -> impl Future<Output = Result<Vec<ImportedSessionParticipant>>> + Send;
}

pub fn get_source(
    kind: ImportSourceKind,
    supabase_path: Option<PathBuf>,
    cache_path: Option<PathBuf>,
) -> Box<dyn ImportSourceDyn> {
    match kind {
        ImportSourceKind::Granola => Box::new(GranolaSource {
            supabase_path,
            cache_path,
        }),
        ImportSourceKind::HyprnoteV0Stable => Box::new(HyprnoteV0StableSource),
        ImportSourceKind::HyprnoteV0Nightly => Box::new(HyprnoteV0NightlySource),
        ImportSourceKind::NoOp => Box::new(NoOpSource),
    }
}

pub fn all_sources() -> Vec<Box<dyn ImportSourceDyn>> {
    vec![
        Box::new(GranolaSource::default()),
        Box::new(HyprnoteV0StableSource),
        Box::new(HyprnoteV0NightlySource),
        Box::new(NoOpSource),
    ]
}

pub fn list_available_sources() -> Vec<ImportSourceInfo> {
    all_sources()
        .into_iter()
        .filter(|s| s.is_available())
        .map(|s| s.info())
        .collect()
}

pub trait ImportSourceDyn: Send + Sync {
    fn info(&self) -> ImportSourceInfo;
    fn is_available(&self) -> bool;
    fn import_notes_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedNote>>> + Send + '_>>;
    fn import_transcripts_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedTranscript>>> + Send + '_>>;
    fn import_humans_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedHuman>>> + Send + '_>>;
    fn import_organizations_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedOrganization>>> + Send + '_>>;
    fn import_session_participants_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedSessionParticipant>>> + Send + '_>>;
}

impl<T: ImportSource> ImportSourceDyn for T {
    fn info(&self) -> ImportSourceInfo {
        ImportSource::info(self)
    }

    fn is_available(&self) -> bool {
        ImportSource::is_available(self)
    }

    fn import_notes_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedNote>>> + Send + '_>> {
        Box::pin(self.import_notes())
    }

    fn import_transcripts_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedTranscript>>> + Send + '_>> {
        Box::pin(self.import_transcripts())
    }

    fn import_humans_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedHuman>>> + Send + '_>> {
        Box::pin(self.import_humans())
    }

    fn import_organizations_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedOrganization>>> + Send + '_>>
    {
        Box::pin(self.import_organizations())
    }

    fn import_session_participants_boxed(
        &self,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<ImportedSessionParticipant>>> + Send + '_>>
    {
        Box::pin(self.import_session_participants())
    }
}
