use crate::types::{ImportResult, ImportSourceInfo, ImportSourceKind};
use std::path::PathBuf;

use super::import_all_from_path;

pub struct HyprnoteV0StableSource;

impl HyprnoteV0StableSource {
    pub fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::HyprnoteV0Stable,
            name: "Hyprnote v0 - Stable".to_string(),
            path: Self::data_dir().to_string_lossy().to_string(),
        }
    }

    pub fn is_available(&self) -> bool {
        Self::db_path().exists()
    }

    pub(in crate::sources) async fn import_all(&self) -> Result<ImportResult, crate::Error> {
        import_all_from_path(&Self::db_path()).await
    }

    fn data_dir() -> PathBuf {
        dirs::data_dir()
            .map(|data| data.join("com.hyprnote.stable"))
            .unwrap()
    }

    fn db_path() -> PathBuf {
        Self::data_dir().join("db.sqlite")
    }
}
