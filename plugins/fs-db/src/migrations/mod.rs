mod v1_0_2_extract_from_sqlite;
mod v1_0_2_nightly_3_move_uuid_folders;
mod v1_0_2_nightly_4_rename_transcript;
pub mod version_macro;

use std::path::Path;

use hypr_version::Version;

use crate::version::{default_detector, write_version};
use crate::Result;

pub(crate) use version_macro::version_from_name;

struct Migration {
    to: &'static Version,
    run: fn(&Path) -> Result<()>,
}

fn all_migrations() -> Vec<Migration> {
    vec![
        Migration {
            to: v1_0_2_nightly_3_move_uuid_folders::version(),
            run: v1_0_2_nightly_3_move_uuid_folders::run,
        },
        Migration {
            to: v1_0_2_nightly_4_rename_transcript::version(),
            run: v1_0_2_nightly_4_rename_transcript::run,
        },
        Migration {
            to: v1_0_2_extract_from_sqlite::version(),
            run: v1_0_2_extract_from_sqlite::run,
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
