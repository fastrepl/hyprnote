mod v1_0_2_move_uuid_folders_to_sessions;
mod v1_0_3_rename_transcript;

use std::path::Path;

use hypr_version::Version;

use crate::version::{default_detector, write_version};
use crate::Result;

struct Migration {
    to: &'static Version,
    run: fn(&Path) -> Result<()>,
}

fn all_migrations() -> Vec<Migration> {
    vec![
        Migration {
            to: &v1_0_2_move_uuid_folders_to_sessions::TO_VERSION,
            run: v1_0_2_move_uuid_folders_to_sessions::run,
        },
        Migration {
            to: &v1_0_3_rename_transcript::TO_VERSION,
            run: v1_0_3_rename_transcript::run,
        },
    ]
}

pub fn run(base_dir: &Path, app_version: &Version) -> Result<()> {
    let Some(vault_version) = default_detector().detect(base_dir) else {
        return Ok(());
    };

    let mut current = vault_version.version;

    let mut migrations = all_migrations();
    migrations.sort_by(|a, b| a.to.cmp(b.to));

    for migration in &migrations {
        if current < *migration.to && *migration.to <= *app_version {
            (migration.run)(base_dir)?;
            write_version(base_dir, migration.to)?;
            current = migration.to.clone();
        }
    }

    Ok(())
}
