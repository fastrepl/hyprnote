use crate::sources::ImportSource;
use crate::types::{
    ImportSourceInfo, ImportSourceKind, ImportedHuman, ImportedNote, ImportedOrganization,
    ImportedSessionParticipant, ImportedTranscript,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsIsData {
    #[serde(default)]
    pub notes: Vec<ImportedNote>,
    #[serde(default)]
    pub transcripts: Vec<ImportedTranscript>,
    #[serde(default)]
    pub humans: Vec<ImportedHuman>,
    #[serde(default)]
    pub organizations: Vec<ImportedOrganization>,
    #[serde(default)]
    pub session_participants: Vec<ImportedSessionParticipant>,
}

pub struct AsIsSource {
    pub json_path: Option<PathBuf>,
}

impl Default for AsIsSource {
    fn default() -> Self {
        Self { json_path: None }
    }
}

impl AsIsSource {
    fn load_data(&self) -> Result<AsIsData, crate::Error> {
        match &self.json_path {
            Some(path) => {
                let content = std::fs::read_to_string(path)?;
                let data: AsIsData = serde_json::from_str(&content)?;
                Ok(data)
            }
            None => Ok(AsIsData {
                notes: vec![],
                transcripts: vec![],
                humans: vec![],
                organizations: vec![],
                session_participants: vec![],
            }),
        }
    }
}

impl ImportSource for AsIsSource {
    fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::AsIs,
            name: "JSON Import".to_string(),
            description: "Import data from a JSON file as-is".to_string(),
        }
    }

    fn is_available(&self) -> bool {
        self.json_path.as_ref().map(|p| p.exists()).unwrap_or(false)
    }

    async fn import_notes(&self) -> Result<Vec<ImportedNote>, crate::Error> {
        Ok(self.load_data()?.notes)
    }

    async fn import_transcripts(&self) -> Result<Vec<ImportedTranscript>, crate::Error> {
        Ok(self.load_data()?.transcripts)
    }

    async fn import_humans(&self) -> Result<Vec<ImportedHuman>, crate::Error> {
        Ok(self.load_data()?.humans)
    }

    async fn import_organizations(&self) -> Result<Vec<ImportedOrganization>, crate::Error> {
        Ok(self.load_data()?.organizations)
    }

    async fn import_session_participants(
        &self,
    ) -> Result<Vec<ImportedSessionParticipant>, crate::Error> {
        Ok(self.load_data()?.session_participants)
    }
}
