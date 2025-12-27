use crate::error::Result;
use crate::sources::ImportSource;
use crate::types::{
    ImportSourceInfo, ImportSourceKind, ImportedHuman, ImportedNote, ImportedOrganization,
    ImportedSessionParticipant, ImportedTranscript,
};

use super::{
    import_humans_from_db, import_notes_from_db, import_organizations_from_db,
    import_session_participants_from_db, import_transcripts_from_db, open_database,
};

pub struct HyprnoteV0NightlySource;

impl ImportSource for HyprnoteV0NightlySource {
    fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::HyprnoteV0Nightly,
            name: "Hyprnote (Nightly)".to_string(),
            description: "Import notes and transcripts from Hyprnote nightly version".to_string(),
        }
    }

    fn is_available(&self) -> bool {
        hyprnote_nightly_db_path().exists()
    }

    async fn import_notes(&self) -> Result<Vec<ImportedNote>> {
        let db = open_database(&hyprnote_nightly_db_path()).await?;
        import_notes_from_db(&db).await
    }

    async fn import_transcripts(&self) -> Result<Vec<ImportedTranscript>> {
        let db = open_database(&hyprnote_nightly_db_path()).await?;
        import_transcripts_from_db(&db).await
    }

    async fn import_humans(&self) -> Result<Vec<ImportedHuman>> {
        let db = open_database(&hyprnote_nightly_db_path()).await?;
        import_humans_from_db(&db).await
    }

    async fn import_organizations(&self) -> Result<Vec<ImportedOrganization>> {
        let db = open_database(&hyprnote_nightly_db_path()).await?;
        import_organizations_from_db(&db).await
    }

    async fn import_session_participants(&self) -> Result<Vec<ImportedSessionParticipant>> {
        let db = open_database(&hyprnote_nightly_db_path()).await?;
        import_session_participants_from_db(&db).await
    }
}

fn hyprnote_nightly_db_path() -> std::path::PathBuf {
    dirs::data_dir()
        .map(|data| data.join("com.hyprnote.nightly").join("db.sqlite"))
        .unwrap()
}
