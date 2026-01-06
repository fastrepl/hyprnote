mod as_is;
mod granola;
mod hyprnote;

pub use as_is::{AsIsData, AsIsSource};
pub use granola::GranolaSource;
pub use hyprnote::{HyprnoteV0NightlySource, HyprnoteV0StableSource};

use crate::types::{ImportResult, ImportSourceInfo, ImportSourceKind};

pub enum AnyImportSource {
    Granola(GranolaSource),
    HyprnoteV0Stable(HyprnoteV0StableSource),
    HyprnoteV0Nightly(HyprnoteV0NightlySource),
    AsIs(AsIsSource),
}

impl AnyImportSource {
    pub fn info(&self) -> ImportSourceInfo {
        match self {
            Self::Granola(s) => s.info(),
            Self::HyprnoteV0Stable(s) => s.info(),
            Self::HyprnoteV0Nightly(s) => s.info(),
            Self::AsIs(s) => s.info(),
        }
    }

    pub fn is_available(&self) -> bool {
        match self {
            Self::Granola(s) => s.is_available(),
            Self::HyprnoteV0Stable(s) => s.is_available(),
            Self::HyprnoteV0Nightly(s) => s.is_available(),
            Self::AsIs(s) => s.is_available(),
        }
    }

    pub async fn import_all(&self) -> Result<ImportResult, crate::Error> {
        match self {
            Self::Granola(s) => Ok(ImportResult {
                notes: s.import_notes().await?,
                transcripts: s.import_transcripts().await?,
                humans: vec![],
                organizations: vec![],
                participants: vec![],
            }),
            Self::HyprnoteV0Stable(s) => s.import_all().await,
            Self::HyprnoteV0Nightly(s) => s.import_all().await,
            Self::AsIs(s) => {
                let data = s.load_data()?;
                Ok(ImportResult {
                    notes: data.notes,
                    transcripts: data.transcripts,
                    humans: data.humans,
                    organizations: data.organizations,
                    participants: data.session_participants,
                })
            }
        }
    }
}

impl From<ImportSourceKind> for AnyImportSource {
    fn from(kind: ImportSourceKind) -> Self {
        match kind {
            ImportSourceKind::Granola => Self::Granola(GranolaSource::default()),
            ImportSourceKind::HyprnoteV0Stable => Self::HyprnoteV0Stable(HyprnoteV0StableSource),
            ImportSourceKind::HyprnoteV0Nightly => Self::HyprnoteV0Nightly(HyprnoteV0NightlySource),
            ImportSourceKind::AsIs => Self::AsIs(AsIsSource::default()),
        }
    }
}

pub fn all_sources() -> Vec<AnyImportSource> {
    vec![
        AnyImportSource::HyprnoteV0Stable(HyprnoteV0StableSource),
        AnyImportSource::HyprnoteV0Nightly(HyprnoteV0NightlySource),
        AnyImportSource::AsIs(AsIsSource::default()),
    ]
}

pub fn list_available_sources() -> Vec<ImportSourceInfo> {
    all_sources()
        .into_iter()
        .filter(|s| s.is_available())
        .map(|s| s.info())
        .collect()
}
