use std::path::Path;

use semver::Version;

use crate::Result;

const HYPRNOTE_DIR: &str = ".hyprnote";
const VERSION_FILE: &str = "version";

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

pub trait VersionHeuristic {
    fn name(&self) -> &'static str;
    fn detect(&self, base_dir: &Path) -> Option<Version>;
}

pub struct VersionDetector {
    heuristics: Vec<Box<dyn VersionHeuristic>>,
}

impl Default for VersionDetector {
    fn default() -> Self {
        Self::new()
    }
}

impl VersionDetector {
    pub fn new() -> Self {
        Self {
            heuristics: Vec::new(),
        }
    }

    pub fn with_heuristic(mut self, heuristic: impl VersionHeuristic + 'static) -> Self {
        self.heuristics.push(Box::new(heuristic));
        self
    }

    pub fn detect(&self, base_dir: &Path) -> Option<VaultVersion> {
        if let Some(version) = read_version(base_dir) {
            return Some(VaultVersion {
                version,
                source: VersionSource::VersionFile,
            });
        }

        for heuristic in &self.heuristics {
            if let Some(version) = heuristic.detect(base_dir) {
                return Some(VaultVersion {
                    version,
                    source: VersionSource::Heuristic(heuristic.name()),
                });
            }
        }

        None
    }
}

pub struct SqliteHeuristic;

impl VersionHeuristic for SqliteHeuristic {
    fn name(&self) -> &'static str {
        "sqlite"
    }

    fn detect(&self, base_dir: &Path) -> Option<Version> {
        let sqlite_file = base_dir.join("db.sqlite");
        if sqlite_file.exists() {
            return Some(Version::new(1, 0, 1));
        }
        None
    }
}

pub fn default_detector() -> VersionDetector {
    VersionDetector::new().with_heuristic(SqliteHeuristic)
}

pub fn read_version(base_dir: &Path) -> Option<Version> {
    let version_file = base_dir.join(HYPRNOTE_DIR).join(VERSION_FILE);
    if version_file.exists() {
        let content = std::fs::read_to_string(&version_file).ok()?;
        return Version::parse(content.trim()).ok();
    }
    None
}

pub fn write_version(base_dir: &Path, version: &Version) -> Result<()> {
    let hyprnote_dir = base_dir.join(HYPRNOTE_DIR);
    std::fs::create_dir_all(&hyprnote_dir)?;
    std::fs::write(hyprnote_dir.join(VERSION_FILE), version.to_string())?;
    Ok(())
}
