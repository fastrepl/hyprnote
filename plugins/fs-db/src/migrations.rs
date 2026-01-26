use std::path::Path;

use semver::Version;

use crate::Result;

pub struct Migration {
    pub name: &'static str,
    pub from: Version,
    pub to: Version,
    pub run: fn(&Path) -> Result<()>,
}

impl Migration {
    pub fn new(
        name: &'static str,
        from: Version,
        to: Version,
        run: fn(&Path) -> Result<()>,
    ) -> Self {
        Self {
            name,
            from,
            to,
            run,
        }
    }
}

pub struct MigrationRunner<'a> {
    base_dir: &'a Path,
    app_version: Version,
    migrations: Vec<Migration>,
}

impl<'a> MigrationRunner<'a> {
    pub fn new(base_dir: &'a Path, app_version: Version) -> Self {
        Self {
            base_dir,
            app_version,
            migrations: Vec::new(),
        }
    }

    pub fn register(mut self, migration: Migration) -> Self {
        self.migrations.push(migration);
        self
    }

    pub fn run(mut self) -> Result<()> {
        let Some(current_version) = self.detect_current_version() else {
            self.write_version(&self.app_version.clone())?;
            return Ok(());
        };

        self.migrations.sort_by(|a, b| a.from.cmp(&b.from));

        let applicable: Vec<_> = self
            .migrations
            .iter()
            .filter(|m| m.from >= current_version && m.to <= self.app_version)
            .collect();

        for migration in applicable {
            (migration.run)(self.base_dir)?;
        }

        self.write_version(&self.app_version.clone())?;
        Ok(())
    }

    fn detect_current_version(&self) -> Option<Version> {
        let version_file = self.base_dir.join(".schema").join("version");
        if version_file.exists() {
            let content = std::fs::read_to_string(&version_file).ok()?;
            return Version::parse(content.trim()).ok();
        }

        let sqlite_file = self.base_dir.join("db.sqlite");
        if sqlite_file.exists() {
            return Some(Version::new(1, 0, 1));
        }

        None
    }

    fn write_version(&self, version: &Version) -> Result<()> {
        let schema_dir = self.base_dir.join(".schema");
        std::fs::create_dir_all(&schema_dir)?;
        std::fs::write(schema_dir.join("version"), version.to_string())?;
        Ok(())
    }
}

pub fn all_migrations() -> Vec<Migration> {
    vec![
        Migration::new(
            "move_uuid_folders_to_sessions",
            Version::new(1, 0, 1),
            Version::new(1, 0, 2),
            ops::move_uuid_folders_to_sessions,
        ),
        Migration::new(
            "rename_transcript",
            Version::new(1, 0, 2),
            Version::new(1, 0, 3),
            ops::rename_transcript,
        ),
    ]
}

mod ops {
    use std::path::Path;

    use uuid::Uuid;

    use crate::Result;

    fn is_uuid(name: &str) -> bool {
        Uuid::try_parse(name).is_ok()
    }

    pub fn rename_transcript(base_dir: &Path) -> Result<()> {
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

        if base_dir.exists() {
            rename_recursively(base_dir)?;
        }

        Ok(())
    }

    pub fn move_uuid_folders_to_sessions(base_dir: &Path) -> Result<()> {
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
}
