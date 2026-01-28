use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum TransformKind {
    HyprnoteV0,
    Granola,
    AsIs,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ImportSourceKind {
    Granola,
    HyprnoteV0Stable,
    HyprnoteV0Nightly,
    AsIs,
}

#[derive(Debug, Clone)]
pub struct ImportSource {
    pub kind: Option<ImportSourceKind>,
    pub transform: TransformKind,
    pub path: PathBuf,
    pub name: String,
}

impl ImportSource {
    pub fn from_path(path: PathBuf, transform: TransformKind) -> Self {
        Self {
            kind: None,
            transform,
            path: path.clone(),
            name: path.to_string_lossy().to_string(),
        }
    }

    pub fn hyprnote_stable() -> Option<Self> {
        let path = dirs::data_dir()?
            .join("com.hyprnote.stable")
            .join("db.sqlite");
        Some(Self {
            kind: Some(ImportSourceKind::HyprnoteV0Stable),
            transform: TransformKind::HyprnoteV0,
            path,
            name: "Hyprnote v0 - Stable".to_string(),
        })
    }

    pub fn hyprnote_nightly() -> Option<Self> {
        let path = dirs::data_dir()?
            .join("com.hyprnote.nightly")
            .join("db.sqlite");
        Some(Self {
            kind: Some(ImportSourceKind::HyprnoteV0Nightly),
            transform: TransformKind::HyprnoteV0,
            path,
            name: "Hyprnote v0 - Nightly".to_string(),
        })
    }

    pub fn granola() -> Option<Self> {
        let path = hypr_granola::default_supabase_path();
        Some(Self {
            kind: Some(ImportSourceKind::Granola),
            transform: TransformKind::Granola,
            path,
            name: "Granola".to_string(),
        })
    }

    pub fn is_available(&self) -> bool {
        self.path.exists()
    }

    pub fn info(&self) -> ImportSourceInfo {
        let (display_path, reveal_path) = match self.kind {
            Some(ImportSourceKind::HyprnoteV0Stable)
            | Some(ImportSourceKind::HyprnoteV0Nightly) => {
                let parent = self.path.parent().unwrap_or(&self.path);
                let display = parent
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| self.path.to_string_lossy().to_string());
                let reveal = parent.to_string_lossy().to_string();
                (display, reveal)
            }
            _ => {
                let path_str = self.path.to_string_lossy().to_string();
                (path_str.clone(), path_str)
            }
        };

        ImportSourceInfo {
            kind: self.kind.clone(),
            transform: self.transform,
            name: self.name.clone(),
            path: display_path,
            reveal_path,
        }
    }
}

impl From<ImportSourceKind> for ImportSource {
    fn from(kind: ImportSourceKind) -> Self {
        match kind {
            ImportSourceKind::HyprnoteV0Stable => Self::hyprnote_stable().unwrap(),
            ImportSourceKind::HyprnoteV0Nightly => Self::hyprnote_nightly().unwrap(),
            ImportSourceKind::Granola => Self::granola().unwrap(),
            ImportSourceKind::AsIs => Self {
                kind: Some(ImportSourceKind::AsIs),
                transform: TransformKind::AsIs,
                path: PathBuf::new(),
                name: "JSON Import".to_string(),
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportSourceInfo {
    pub kind: Option<ImportSourceKind>,
    pub transform: TransformKind,
    pub name: String,
    pub path: String,
    pub reveal_path: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportStats {
    pub notes_count: usize,
    pub transcripts_count: usize,
    pub humans_count: usize,
    pub organizations_count: usize,
    pub participants_count: usize,
    pub templates_count: usize,
    pub enhanced_notes_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportDataResult {
    pub stats: ImportStats,
    pub data: serde_json::Value,
}

pub struct ImportResult {
    pub notes: Vec<ImportedNote>,
    pub transcripts: Vec<ImportedTranscript>,
    pub humans: Vec<ImportedHuman>,
    pub organizations: Vec<ImportedOrganization>,
    pub participants: Vec<ImportedSessionParticipant>,
    pub templates: Vec<ImportedTemplate>,
    pub enhanced_notes: Vec<ImportedEnhancedNote>,
}

impl ImportResult {
    pub fn stats(&self) -> ImportStats {
        ImportStats {
            organizations_count: self.organizations.len(),
            humans_count: self.humans.len(),
            notes_count: self.notes.len(),
            transcripts_count: self.transcripts.len(),
            participants_count: self.participants.len(),
            templates_count: self.templates.len(),
            enhanced_notes_count: self.enhanced_notes.len(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub raw_md: Option<String>,
    pub enhanced_content: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub folder_id: Option<String>,
    pub event_id: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedTranscriptSegment {
    pub id: String,
    pub start_timestamp: String,
    pub end_timestamp: String,
    pub text: String,
    pub speaker: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedWord {
    pub id: String,
    pub start_ms: Option<f64>,
    pub end_ms: Option<f64>,
    pub text: String,
    pub speaker: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedTranscript {
    pub id: String,
    pub session_id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub segments: Vec<ImportedTranscriptSegment>,
    pub words: Vec<ImportedWord>,
    pub start_ms: Option<f64>,
    pub end_ms: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedHuman {
    pub id: String,
    pub created_at: String,
    pub name: String,
    pub email: Option<String>,
    pub org_id: Option<String>,
    pub job_title: Option<String>,
    pub linkedin_username: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedOrganization {
    pub id: String,
    pub created_at: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedSessionParticipant {
    pub session_id: String,
    pub human_id: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedEnhancedNote {
    pub id: String,
    pub session_id: String,
    pub content: String,
    pub template_id: Option<String>,
    pub position: i32,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedTemplate {
    pub id: String,
    pub title: String,
    pub description: String,
    pub sections: Vec<ImportedTemplateSection>,
    pub tags: Vec<String>,
    pub context_option: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedTemplateSection {
    pub title: String,
    pub description: String,
}
