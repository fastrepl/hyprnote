use std::path::PathBuf;

use crate::Error;
use crate::path::is_uuid;

pub fn move_uuid_folders_to_sessions(base_dir: &PathBuf) -> Result<(), Error> {
    let sessions_dir = base_dir.join("sessions");

    if !base_dir.exists() {
        return Ok(());
    }

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

        if !is_uuid(name) {
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
