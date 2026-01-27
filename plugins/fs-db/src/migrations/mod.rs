mod v1_0_2_move_uuid_folders_to_sessions;
mod v1_0_3_rename_transcript;

use std::path::Path;

use hypr_version::Version;

use crate::version::default_detector;
use crate::Result;

struct Migration {
    from: Version,
    to: Version,
    run: fn(&Path) -> Result<()>,
}

fn all_migrations() -> Vec<Migration> {
    vec![
        Migration {
            from: v1_0_2_move_uuid_folders_to_sessions::FROM_VERSION,
            to: v1_0_2_move_uuid_folders_to_sessions::TO_VERSION,
            run: v1_0_2_move_uuid_folders_to_sessions::run,
        },
        Migration {
            from: v1_0_3_rename_transcript::FROM_VERSION,
            to: v1_0_3_rename_transcript::TO_VERSION,
            run: v1_0_3_rename_transcript::run,
        },
    ]
}

pub fn run(base_dir: &Path, app_version: &Version) -> Result<()> {
    let Some(vault_version) = default_detector().detect(base_dir) else {
        return Ok(());
    };

    let mut current = vault_version.version;

    if current.base() == app_version.base() {
        return Ok(());
    }

    let mut migrations = all_migrations();
    migrations.sort_by(|a, b| a.from.cmp(&b.from));

    for migration in &migrations {
        let migration_applies =
            migration.from.base() == current.base()
            && migration.to.base() <= app_version.base();

        if migration_applies {
            (migration.run)(base_dir)?;
            current = migration.to.clone();
        }
    }

    if current.base() != app_version.base() {
        return Err(crate::Error::MigrationGap {
            from: current,
            to: app_version.clone(),
        });
    }

    Ok(())
}
