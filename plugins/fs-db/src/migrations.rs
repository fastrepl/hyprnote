use std::path::Path;

use semver::Version;
use uuid::Uuid;

use crate::{Migration, MigrationRunner, Result};

fn v(s: &str) -> Version {
    Version::parse(s).unwrap()
}

fn is_uuid(name: &str) -> bool {
    Uuid::try_parse(name).is_ok()
}

pub fn rename_transcript(base_dir: &Path) -> Result<()> {
    if !base_dir.exists() {
        return Ok(());
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

    rename_recursively(base_dir)
}

pub fn move_uuid_folders_to_sessions(base_dir: &Path) -> Result<()> {
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

fn migration_1_0_1_to_1_0_2(base_dir: &Path) -> Result<()> {
    move_uuid_folders_to_sessions(base_dir)?;
    rename_transcript(base_dir)?;
    Ok(())
}

pub fn all_migrations() -> Vec<Migration> {
    vec![Migration::new(
        "extract_from_legacy_structure",
        v("1.0.1"),
        v("1.0.2"),
        migration_1_0_1_to_1_0_2,
    )]
}

pub fn run_migrations(base_dir: &Path, app_version: Version) -> Result<()> {
    let migrations = all_migrations();
    let runner = MigrationRunner::new(base_dir, app_version, &migrations);
    let _report = runner.run()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_migrations_are_sorted_by_from_version() {
        let migrations = all_migrations();
        for window in migrations.windows(2) {
            assert!(window[0].from <= window[1].from);
        }
    }

    #[test]
    fn migration_chain_is_continuous() {
        let migrations = all_migrations();
        for window in migrations.windows(2) {
            assert_eq!(window[0].to, window[1].from);
        }
    }
}
