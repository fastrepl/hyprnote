use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub const CURRENT_API_VERSION: &str = "0.1";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default = "default_api_version")]
    pub api_version: String,
    pub entry: String,
    #[serde(default)]
    pub panels: Vec<PanelDeclaration>,
    #[serde(default)]
    pub permissions: ExtensionPermissions,
}

fn default_api_version() -> String {
    CURRENT_API_VERSION.to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PanelDeclaration {
    pub id: String,
    pub title: String,
    pub entry: String,
    #[serde(default)]
    pub styles: Option<String>,
}

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

    pub fn panel_path(&self, panel_id: &str) -> Option<PathBuf> {
        self.manifest
            .panels
            .iter()
            .find(|p| p.id == panel_id)
            .and_then(|panel| {
                let canonical_root = self.path.canonicalize().ok()?;
                let joined = self.path.join(&panel.entry);
                let canonical_panel = joined.canonicalize().ok()?;

                if canonical_panel.starts_with(&canonical_root) {
                    Some(canonical_panel)
                } else {
                    None
                }
            })
    }

    pub fn panel_styles_path(&self, panel_id: &str) -> Option<PathBuf> {
        self.manifest
            .panels
            .iter()
            .find(|p| p.id == panel_id)
            .and_then(|panel| {
                let styles = panel.styles.as_ref()?;
                let canonical_root = self.path.canonicalize().ok()?;
                let joined = self.path.join(styles);
                let canonical_styles = joined.canonicalize().ok()?;

                if canonical_styles.starts_with(&canonical_root) {
                    Some(canonical_styles)
                } else {
                    None
                }
            })
    }

    pub fn panels(&self) -> &[PanelDeclaration] {
        &self.manifest.panels
    }
}

pub fn discover_extensions(extensions_dir: &PathBuf) -> Vec<Extension> {
    let mut extensions = Vec::new();

    if !extensions_dir.exists() {
        return extensions;
    }

    let entries = match std::fs::read_dir(extensions_dir) {
        Ok(entries) => entries,
        Err(_) => return extensions,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Ok(extension) = Extension::load(path) {
                extensions.push(extension);
            }
        }
    }

    extensions
}
