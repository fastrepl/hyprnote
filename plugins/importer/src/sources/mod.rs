mod as_is;
mod granola;
mod hyprnote;

pub use as_is::AsIsData;

use crate::types::{ImportResult, ImportSource, ImportSourceInfo, TransformKind};

pub async fn import_all(source: &ImportSource) -> Result<ImportResult, crate::Error> {
    match source.transform {
        TransformKind::HyprnoteV0 => hyprnote::import_all_from_path(&source.path).await,
        TransformKind::Granola => granola::import_all_from_path(&source.path).await,
        TransformKind::AsIs => {
            let data = as_is::load_data(&source.path)?;
            Ok(ImportResult {
                notes: data.notes,
                transcripts: data.transcripts,
                humans: data.humans,
                organizations: data.organizations,
                participants: data.session_participants,
                templates: vec![],
            })
        }
    }
}

pub fn all_sources() -> Vec<ImportSource> {
    [
        ImportSource::hyprnote_stable(),
        ImportSource::hyprnote_nightly(),
    ]
    .into_iter()
    .flatten()
    .collect()
}

pub fn list_available_sources() -> Vec<ImportSourceInfo> {
    all_sources()
        .into_iter()
        .filter(|s| s.is_available())
        .map(|s| s.info())
        .collect()
}
