use std::path::Path;

use hypr_version::Version;

use crate::Result;

const HYPRNOTE_DIR: &str = ".hyprnote";
const VERSION_FILE: &str = "version";

pub fn exists(base_dir: &Path) -> bool {
    base_dir.join(HYPRNOTE_DIR).join(VERSION_FILE).exists()
}

pub fn read(base_dir: &Path) -> Option<Version> {
    let version_file = base_dir.join(HYPRNOTE_DIR).join(VERSION_FILE);
    if version_file.exists() {
        let content = std::fs::read_to_string(&version_file).ok()?;
        return content.trim().parse().ok();
    }
    None
}

pub fn write(base_dir: &Path, version: &Version) -> Result<()> {
    let hyprnote_dir = base_dir.join(HYPRNOTE_DIR);
    std::fs::create_dir_all(&hyprnote_dir)?;
    std::fs::write(hyprnote_dir.join(VERSION_FILE), version.to_string())?;
    Ok(())
}
