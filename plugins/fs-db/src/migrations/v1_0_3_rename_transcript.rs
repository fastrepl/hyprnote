use std::path::Path;

use hypr_version::Version;

use crate::Result;

pub static TO_VERSION: Version = Version::new(1, 0, 3);

pub fn run(base_dir: &Path) -> Result<()> {
    if !base_dir.exists() {
        return Ok(());
    }

    rename_recursively(base_dir)?;
    Ok(())
}

fn rename_recursively(dir: &Path) -> Result<()> {
    let entries = std::fs::read_dir(dir)?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            rename_recursively(&path)?;
        } else if path.file_name().and_then(|n| n.to_str()) == Some("_transcript.json") {
            let target = path.with_file_name("transcript.json");
            if target.exists() {
                std::fs::remove_file(&path)?;
            } else {
                std::fs::rename(&path, &target)?;
            }
        }
    }

    Ok(())
}
