use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FolderInfo {
    pub name: String,
    pub parent_folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ListFoldersResult {
    pub folders: HashMap<String, FolderInfo>,
    pub session_folder_map: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ScanResult {
    pub files: HashMap<String, String>,
    pub dirs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CleanupTarget {
    Files {
        subdir: String,
        extension: String,
    },
    Dirs {
        subdir: String,
        marker_file: String,
    },
    FilesRecursive {
        subdir: String,
        marker_file: String,
        extension: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentSaveResult {
    pub path: String,
    pub attachment_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentInfo {
    pub attachment_id: String,
    pub path: String,
    pub extension: String,
    pub modified_at: String,
}
