use std::path::Path;

use semver::Version;
use uuid::Uuid;

use crate::Result;

pub const FROM_VERSION: Version = Version::new(1, 0, 1);
pub const TO_VERSION: Version = Version::new(1, 0, 2);

pub fn run(base_dir: &Path) -> Result<()> {
    if !base_dir.exists() {
        return Ok(());
    }

    let sessions_dir = base_dir.join("sessions");
    std::fs::create_dir_all(&sessions_dir)?;

    let entries = std::fs::read_dir(base_dir)?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        if Uuid::try_parse(name).is_err() {
            continue;
        }

        let target = sessions_dir.join(name);

        if target.exists() {
            continue;
        }

        std::fs::rename(&path, &target)?;
    }

    Ok(())
}
