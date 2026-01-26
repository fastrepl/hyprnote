mod v1_0_2_move_uuid_folders_to_sessions;
mod v1_0_3_rename_transcript;

use std::path::Path;

use semver::Version;

use crate::version::{default_detector, write_schema_version};
use crate::Result;

pub struct Migration {
    pub name: &'static str,
    pub from: Version,
    pub to: Version,
    pub run: fn(&Path) -> Result<()>,
}

impl Migration {
    pub const fn new(
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
        let Some(vault_version) = default_detector().detect(self.base_dir) else {
            write_schema_version(self.base_dir, &self.app_version)?;
            return Ok(());
        };

        let mut current = vault_version.version;

        if current == self.app_version {
            return Ok(());
        }

        self.migrations.sort_by(|a, b| a.from.cmp(&b.from));

        for migration in &self.migrations {
            if migration.from == current && migration.to <= self.app_version {
                (migration.run)(self.base_dir)?;
                current = migration.to.clone();
            }
        }

        if current != self.app_version {
            return Err(crate::Error::MigrationGap {
                from: current,
                to: self.app_version,
            });
        }

        write_schema_version(self.base_dir, &self.app_version)?;
        Ok(())
    }
}

pub fn all_migrations() -> Vec<Migration> {
    vec![
        Migration::new(
            "move_uuid_folders_to_sessions",
            v1_0_2_move_uuid_folders_to_sessions::FROM_VERSION,
            v1_0_2_move_uuid_folders_to_sessions::TO_VERSION,
            v1_0_2_move_uuid_folders_to_sessions::run,
        ),
        Migration::new(
            "rename_transcript",
            v1_0_3_rename_transcript::FROM_VERSION,
            v1_0_3_rename_transcript::TO_VERSION,
            v1_0_3_rename_transcript::run,
        ),
    ]
}
