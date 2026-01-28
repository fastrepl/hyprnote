use std::path::Path;

use hypr_version::Version;

use super::{Migration, all_migrations};
use crate::Result;
use crate::version::{DetectedVersion, detect_version, write_version};

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
        let nightly_3 = super::super::v1_0_2_nightly_3_move_uuid_folders::version();
        let nightly_4 = super::super::v1_0_2_nightly_4_rename_transcript::version();
        let nightly_14 = super::super::v1_0_2_nightly_14_extract_from_sqlite::version();

        let cases: &[(DetectedVersion, &str, Vec<&Version>)] = &[
            (DetectedVersion::Fresh, "1.0.2", vec![]),
            (DetectedVersion::Unknown, "1.0.2", vec![]),
            // 1.0.1 stable -> 1.0.2 stable: all migrations run
            (
                known("1.0.1"),
                "1.0.2",
                vec![nightly_3, nightly_4, nightly_14],
            ),
            // nightly upgrades within early nightlies
            (known("1.0.2-nightly.2"), "1.0.2-nightly.3", vec![nightly_3]),
            (
                known("1.0.2-nightly.2"),
                "1.0.2-nightly.4",
                vec![nightly_3, nightly_4],
            ),
            // nightly.12 -> nightly.14: extraction runs
            (
                known("1.0.2-nightly.12"),
                "1.0.2-nightly.14",
                vec![nightly_14],
            ),
            // nightly.13 -> nightly.14: extraction runs
            (
                known("1.0.2-nightly.13"),
                "1.0.2-nightly.14",
                vec![nightly_14],
            ),
            // nightly.14 -> nightly.15: nothing runs (already past extraction)
            (known("1.0.2-nightly.14"), "1.0.2-nightly.15", vec![]),
            // nightly.14 -> 1.0.2 stable: nothing runs
            (known("1.0.2-nightly.14"), "1.0.2", vec![]),
            // 1.0.2 stable -> 1.0.3 stable: nothing runs
            (known("1.0.2"), "1.0.3", vec![]),
            // nightly.14 -> 1.0.3-nightly.1: nothing runs
            (known("1.0.2-nightly.14"), "1.0.3-nightly.1", vec![]),
            // early nightly -> stable: all applicable migrations
            (
                known("1.0.2-nightly.2"),
                "1.0.2",
                vec![nightly_3, nightly_4, nightly_14],
            ),
            (
                known("1.0.2-nightly.3"),
                "1.0.2",
                vec![nightly_4, nightly_14],
            ),
            (known("1.0.2-nightly.4"), "1.0.2", vec![nightly_14]),
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
