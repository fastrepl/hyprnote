use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::frontmatter::ParsedDocument;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TiptapWithFrontmatter {
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub tiptap: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", content = "value")]
pub enum MdContent {
    #[serde(rename = "md")]
    Md(String),
    #[serde(rename = "tiptap")]
    Tiptap(serde_json::Value),
    #[serde(rename = "frontmatter")]
    Frontmatter(ParsedDocument),
    #[serde(rename = "tiptap_frontmatter")]
    TiptapFrontmatter(TiptapWithFrontmatter),
}

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
