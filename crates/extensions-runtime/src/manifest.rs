use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub entry: String,
    #[serde(default)]
    pub permissions: ExtensionPermissions,
}

/// Extension permissions declaration.
/// Note: Permissions are currently not enforced. The extension runtime runs with full capabilities.
/// This struct is defined for future use when permission enforcement is implemented.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExtensionPermissions {
    #[serde(default)]
    pub db: Vec<String>,
    #[serde(default)]
    pub network: Vec<String>,
    #[serde(default)]
    pub filesystem: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct Extension {
    pub manifest: ExtensionManifest,
    pub path: PathBuf,
}

impl Extension {
    pub fn load(path: PathBuf) -> crate::Result<Self> {
        let manifest_path = path.join("extension.json");
        let manifest_content = std::fs::read_to_string(&manifest_path)?;
        let manifest: ExtensionManifest = serde_json::from_str(&manifest_content)
            .map_err(|e| crate::Error::InvalidManifest(e.to_string()))?;

        let entry_path = path.join(&manifest.entry);
        let canonical_base = path.canonicalize().map_err(|e| crate::Error::Io(e))?;
        let canonical_entry = entry_path.canonicalize().map_err(|e| crate::Error::Io(e))?;
        if !canonical_entry.starts_with(&canonical_base) {
            return Err(crate::Error::InvalidManifest(
                "entry path escapes extension directory".to_string(),
            ));
        }

        Ok(Self { manifest, path })
    }

    pub fn entry_path(&self) -> PathBuf {
        self.path.join(&self.manifest.entry)
    }
}
