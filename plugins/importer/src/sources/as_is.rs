use crate::types::{
    ImportedHuman, ImportedNote, ImportedOrganization, ImportedSessionParticipant,
    ImportedTranscript,
};
use serde::{Deserialize, Serialize};
use std::path::Path;

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

pub fn load_data(path: &Path) -> Result<AsIsData, crate::Error> {
    if !path.exists() {
        return Ok(AsIsData::default());
    }
    let content = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content)?)
}
