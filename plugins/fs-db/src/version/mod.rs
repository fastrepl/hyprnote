#[macro_use]
pub(crate) mod r#macro;

mod heuristics;
pub(crate) mod known;

use std::path::Path;

pub use hypr_version::Version;
pub(crate) use r#macro::version_from_name;

pub use known::write as write_version;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DetectedVersion {
    Fresh,
    Known(VaultVersion),
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VaultVersion {
    pub version: Version,
    pub source: VersionSource,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VersionSource {
    VersionFile,
    Heuristic(&'static str),
}

pub fn detect_version(base_dir: &Path) -> DetectedVersion {
    if let Some(version) = known::read(base_dir) {
        return DetectedVersion::Known(VaultVersion {
            version,
            source: VersionSource::VersionFile,
        });
    }

    heuristics::cold_start(base_dir)
}
