use crate::error::Result;
use crate::sources::ImportSource;
use crate::types::{
    ImportSourceInfo, ImportSourceKind, ImportedHuman, ImportedNote, ImportedOrganization,
    ImportedSessionParticipant, ImportedTranscript,
};

pub struct NoOpSource;

impl ImportSource for NoOpSource {
    fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::NoOp,
            name: "NoOp (Dev)".to_string(),
            description: "Import data as-is without transformation (for development)".to_string(),
        }
    }

    fn is_available(&self) -> bool {
        true
    }

    async fn import_notes(&self) -> Result<Vec<ImportedNote>> {
        Ok(vec![])
    }

    async fn import_transcripts(&self) -> Result<Vec<ImportedTranscript>> {
        Ok(vec![])
    }

    async fn import_humans(&self) -> Result<Vec<ImportedHuman>> {
        Ok(vec![])
    }

    async fn import_organizations(&self) -> Result<Vec<ImportedOrganization>> {
        Ok(vec![])
    }

    async fn import_session_participants(&self) -> Result<Vec<ImportedSessionParticipant>> {
        Ok(vec![])
    }
}
