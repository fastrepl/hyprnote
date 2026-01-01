use crate::types::{ImportResult, ImportSourceInfo, ImportSourceKind};
use std::path::PathBuf;

use super::import_all_from_path;

pub struct HyprnoteV0StableSource;

impl HyprnoteV0StableSource {
    pub fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::HyprnoteV0Stable,
            name: "Hyprnote (Stable)".to_string(),
            description: "Import notes and transcripts from Hyprnote stable version".to_string(),
        }
    }

    pub fn is_available(&self) -> bool {
        Self::db_path().exists()
    }

    pub(in crate::sources) async fn import_all(&self) -> Result<ImportResult, crate::Error> {
        import_all_from_path(&Self::db_path()).await
    }

    fn db_path() -> PathBuf {
        dirs::data_dir()
            .map(|data| data.join("com.hyprnote.stable").join("db.sqlite"))
            .unwrap()
    }
}
