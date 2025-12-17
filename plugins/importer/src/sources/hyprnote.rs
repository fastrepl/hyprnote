use crate::error::Result;
use crate::sources::{ImportConfig, ImportSource};
use crate::types::{ImportSourceInfo, ImportSourceKind, ImportedNote, ImportedTranscript};
use std::path::PathBuf;

pub struct HyprnoteV0StableSource;
pub struct HyprnoteV0NightlySource;

pub fn default_stable_path() -> PathBuf {
    dirs::data_dir()
        .map(|data| data.join("com.hyprnote.stable"))
        .unwrap_or_else(|| PathBuf::from("com.hyprnote.stable"))
}

pub fn default_nightly_path() -> PathBuf {
    dirs::data_dir()
        .map(|data| data.join("com.hyprnote.nightly"))
        .unwrap_or_else(|| PathBuf::from("com.hyprnote.nightly"))
}

pub fn stable_exists() -> bool {
    default_stable_path().exists()
}

pub fn nightly_exists() -> bool {
    default_nightly_path().exists()
}

impl ImportSource for HyprnoteV0StableSource {
    fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::HyprnoteV0Stable,
            name: "Hyprnote (Stable)".to_string(),
            description: "Import notes and transcripts from Hyprnote stable version".to_string(),
        }
    }

    async fn import_notes(&self, _config: ImportConfig) -> Result<Vec<ImportedNote>> {
        Ok(vec![])
    }

    async fn import_transcripts(&self, _config: ImportConfig) -> Result<Vec<ImportedTranscript>> {
        Ok(vec![])
    }
}

impl ImportSource for HyprnoteV0NightlySource {
    fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::HyprnoteV0Nightly,
            name: "Hyprnote (Nightly)".to_string(),
            description: "Import notes and transcripts from Hyprnote nightly version".to_string(),
        }
    }

    async fn import_notes(&self, _config: ImportConfig) -> Result<Vec<ImportedNote>> {
        Ok(vec![])
    }

    async fn import_transcripts(&self, _config: ImportConfig) -> Result<Vec<ImportedTranscript>> {
        Ok(vec![])
    }
}
