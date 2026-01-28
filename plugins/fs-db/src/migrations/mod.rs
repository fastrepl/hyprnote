mod v1_0_2_extract_from_sqlite;
mod v1_0_2_nightly_3_move_uuid_folders;
mod v1_0_2_nightly_4_rename_transcript;

use std::future::Future;
use std::path::Path;
use std::pin::Pin;

use hypr_version::Version;

use crate::version::{detect_version, version_from_name, write_version, DetectedVersion};
use crate::Result;

type MigrationFn = for<'a> fn(&'a Path) -> Pin<Box<dyn Future<Output = Result<()>> + Send + 'a>>;

struct Migration {
    to: &'static Version,
    run: MigrationFn,
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

fn migrations_to_apply(detected: &DetectedVersion, to: &Version) -> Vec<Migration> {
    let current = match detected {
        DetectedVersion::Fresh | DetectedVersion::Unknown => return vec![],
        DetectedVersion::Known(v) => v.version.clone(),
    };

    let mut current = current;
    let mut result = vec![];

    let mut migrations = all_migrations();
    migrations.sort_by(|a, b| a.to.cmp(b.to));

    for migration in migrations {
        if current < *migration.to && *migration.to <= *to {
            current = migration.to.clone();
            result.push(migration);
        }
    }

    result
}

pub async fn run(base_dir: &Path, app_version: &Version) -> Result<()> {
    let detected = detect_version(base_dir);

    if matches!(detected, DetectedVersion::Fresh | DetectedVersion::Unknown) {
        write_version(base_dir, app_version)?;
        return Ok(());
    }

    for migration in migrations_to_apply(&detected, app_version) {
        (migration.run)(base_dir).await?;
        write_version(base_dir, migration.to)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::version::{VaultVersion, VersionSource};

    fn v(s: &str) -> Version {
        s.parse().unwrap()
    }

    fn known(s: &str) -> DetectedVersion {
        DetectedVersion::Known(VaultVersion {
            version: v(s),
            source: VersionSource::VersionFile,
        })
    }

    #[test]
    fn test_migrations_to_apply() {
        let nightly_3 = v1_0_2_nightly_3_move_uuid_folders::version();
        let nightly_4 = v1_0_2_nightly_4_rename_transcript::version();
        let v1_0_2 = v1_0_2_extract_from_sqlite::version();

        let cases: &[(DetectedVersion, &str, Vec<&Version>)] = &[
            (DetectedVersion::Fresh, "1.0.2", vec![]),
            (DetectedVersion::Unknown, "1.0.2", vec![]),
            (known("1.0.1"), "1.0.2", vec![nightly_3, nightly_4, v1_0_2]),
            (known("1.0.2-nightly.2"), "1.0.2-nightly.3", vec![nightly_3]),
            (known("1.0.2-nightly.2"), "1.0.2-nightly.4", vec![nightly_3, nightly_4]),
            (known("1.0.2-nightly.2"), "1.0.2", vec![nightly_3, nightly_4, v1_0_2]),
            (known("1.0.2-nightly.3"), "1.0.2", vec![nightly_4, v1_0_2]),
            (known("1.0.2-nightly.4"), "1.0.2", vec![v1_0_2]),
            (known("1.0.2"), "1.0.3", vec![]),
        ];

        for (detected, to, expected) in cases {
            let result: Vec<_> = migrations_to_apply(detected, &v(to))
                .iter()
                .map(|m| m.to)
                .collect();
            assert_eq!(result, *expected, "detected {detected:?} to {to}");
        }
    }
}
