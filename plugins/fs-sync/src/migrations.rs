use std::path::Path;

use crate::Error;
use crate::path::is_uuid;

#[derive(Debug)]
pub struct MigrationResult {
    pub sessions_moved: usize,
    pub chats_moved: usize,
}

pub fn migrate_content_base(old_base: &Path, new_base: &Path) -> Result<MigrationResult, Error> {
    let mut result = MigrationResult {
        sessions_moved: 0,
        chats_moved: 0,
    };

    if !old_base.exists() {
        return Ok(result);
    }

    std::fs::create_dir_all(new_base)?;

    let old_sessions = old_base.join("sessions");
    let new_sessions = new_base.join("sessions");
    if old_sessions.exists() && old_sessions.is_dir() {
        std::fs::create_dir_all(&new_sessions)?;
        for entry in std::fs::read_dir(&old_sessions)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().unwrap();
                let target = new_sessions.join(name);
                if !target.exists() {
                    std::fs::rename(&path, &target)?;
                    result.sessions_moved += 1;
                }
            }
        }
    }

    let old_chats = old_base.join("chats");
    let new_chats = new_base.join("chats");
    if old_chats.exists() && old_chats.is_dir() {
        std::fs::create_dir_all(&new_chats)?;
        for entry in std::fs::read_dir(&old_chats)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().unwrap();
                let target = new_chats.join(name);
                if !target.exists() {
                    std::fs::rename(&path, &target)?;
                    result.chats_moved += 1;
                }
            }
        }
    }

    Ok(result)
}

pub fn rename_transcript(base_dir: &Path) -> Result<(), Error> {
    if !base_dir.exists() {
        return Ok(());
    }

    fn rename_recursively(dir: &Path) -> Result<(), Error> {
        let entries = std::fs::read_dir(dir)?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                rename_recursively(&path)?;
            } else if path.file_name().and_then(|n| n.to_str()) == Some("_transcript.json") {
                let target = path.with_file_name("transcript.json");
                if !target.exists() {
                    std::fs::rename(&path, &target)?;
                }
            }
        }

        Ok(())
    }

    rename_recursively(base_dir)
}

pub fn move_uuid_folders_to_sessions(base_dir: &Path) -> Result<(), Error> {
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
