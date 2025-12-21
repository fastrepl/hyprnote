use crate::error::Result;
use crate::sources::ImportSource;
use crate::types::{ImportSourceInfo, ImportSourceKind, ImportedNote, ImportedTranscript};

use super::{import_notes_from_db, import_transcripts_from_db, open_database};

pub struct HyprnoteV0StableSource;

impl ImportSource for HyprnoteV0StableSource {
    fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::HyprnoteV0Stable,
            name: "Hyprnote (Stable)".to_string(),
            description: "Import notes and transcripts from Hyprnote stable version".to_string(),
        }
    }

    fn is_available(&self) -> bool {
        hyprnote_stable_db_path().exists()
    }

    async fn import_notes(&self) -> Result<Vec<ImportedNote>> {
        let db = open_database(&hyprnote_stable_db_path()).await?;
        import_notes_from_db(&db).await
    }

    async fn import_transcripts(&self) -> Result<Vec<ImportedTranscript>> {
        let db = open_database(&hyprnote_stable_db_path()).await?;
        import_transcripts_from_db(&db).await
    }
}

fn hyprnote_stable_db_path() -> std::path::PathBuf {
    dirs::data_dir()
        .map(|data| data.join("com.hyprnote.stable").join("db.sqlite"))
        .unwrap()
}
