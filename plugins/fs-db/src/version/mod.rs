#[macro_use]
pub(crate) mod r#macro;

mod heuristics;
mod known;

use std::path::Path;

pub use hypr_version::Version;
pub(crate) use r#macro::version_from_name;

pub use known::write as write_version;

#[derive(Debug, Clone)]
pub struct VaultVersion {
    pub version: Version,
    pub source: VersionSource,
}

#[derive(Debug, Clone)]
pub enum VersionSource {
    VersionFile,
    Heuristic(&'static str),
}

pub fn detect_version(base_dir: &Path) -> Option<VaultVersion> {
    if let Some(version) = known::read(base_dir) {
        return Some(VaultVersion {
            version,
            source: VersionSource::VersionFile,
        });
    }

    if let Some(version) = heuristics::cold_start(base_dir) {
        return Some(VaultVersion {
            version,
            source: VersionSource::Heuristic("cold_start"),
        });
    }

    None
}
