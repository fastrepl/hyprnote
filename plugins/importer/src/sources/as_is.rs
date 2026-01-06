use crate::types::{
    ImportSourceInfo, ImportSourceKind, ImportedHuman, ImportedNote, ImportedOrganization,
    ImportedSessionParticipant, ImportedTranscript,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
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

#[derive(Default)]
pub struct AsIsSource {
    pub json_path: Option<PathBuf>,
}

impl AsIsSource {
    pub fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::AsIs,
            name: "JSON Import".to_string(),
            path: self
                .json_path
                .as_ref()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default(),
        }
    }

    pub fn is_available(&self) -> bool {
        self.json_path.as_ref().map(|p| p.exists()).unwrap_or(false)
    }

    pub fn load_data(&self) -> Result<AsIsData, crate::Error> {
        match &self.json_path {
            Some(path) => {
                let content = std::fs::read_to_string(path)?;
                Ok(serde_json::from_str(&content)?)
            }
            None => Ok(AsIsData::default()),
        }
    }
}
