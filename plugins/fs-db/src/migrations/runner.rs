use std::path::Path;

use hypr_version::Version;

use super::{Migration, all_migrations};
use crate::Result;
use crate::version::{DetectedVersion, detect_version, write_version};

fn migrations_to_apply(detected: &DetectedVersion, to: &Version) -> Vec<&'static dyn Migration> {
    let current = match detected {
        DetectedVersion::Fresh | DetectedVersion::Unknown => return vec![],
        DetectedVersion::Known(v) => v.version.clone(),
    };

    let mut current = current;
    let mut result = vec![];

    let mut migrations = all_migrations();
    migrations.sort_by(|a, b| a.introduced_in().cmp(b.introduced_in()));

    for migration in migrations {
        if current < *migration.introduced_in() && *migration.introduced_in() <= *to {
            current = migration.introduced_in().clone();
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
        migration.run(base_dir).await?;
        write_version(base_dir, migration.introduced_in())?;
    }

    write_version(base_dir, app_version)?;
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
        let nightly_1 = super::super::v1_0_2_nightly_1_from_v0::Migrate.introduced_in();
        let nightly_3 = super::super::v1_0_2_nightly_3_move_uuid_folders::Migrate.introduced_in();
        let nightly_4 = super::super::v1_0_2_nightly_4_rename_transcript::Migrate.introduced_in();
        let nightly_14 =
            super::super::v1_0_2_nightly_14_extract_from_sqlite::Migrate.introduced_in();

        struct Case {
            from: DetectedVersion,
            to: &'static str,
            expected: Vec<&'static Version>,
        }

        let cases: &[Case] = &[
            Case {
                from: DetectedVersion::Fresh,
                to: "1.0.2",
                expected: vec![],
            },
            Case {
                from: DetectedVersion::Unknown,
                to: "1.0.2",
                expected: vec![],
            },
            Case {
                from: known("1.0.1"),
                to: "1.0.2",
                expected: vec![nightly_1, nightly_3, nightly_4, nightly_14],
            },
            Case {
                from: known("1.0.2-nightly.2"),
                to: "1.0.2-nightly.3",
                expected: vec![nightly_3],
            },
            Case {
                from: known("1.0.2-nightly.2"),
                to: "1.0.2-nightly.4",
                expected: vec![nightly_3, nightly_4],
            },
            Case {
                from: known("1.0.2-nightly.12"),
                to: "1.0.2-nightly.14",
                expected: vec![nightly_14],
            },
            Case {
                from: known("1.0.2-nightly.13"),
                to: "1.0.2-nightly.14",
                expected: vec![nightly_14],
            },
            Case {
                from: known("1.0.2-nightly.14"),
                to: "1.0.2-nightly.15",
                expected: vec![],
            },
            Case {
                from: known("1.0.2-nightly.14"),
                to: "1.0.2",
                expected: vec![],
            },
            Case {
                from: known("1.0.2"),
                to: "1.0.3",
                expected: vec![],
            },
            Case {
                from: known("1.0.2-nightly.14"),
                to: "1.0.3-nightly.1",
                expected: vec![],
            },
            Case {
                from: known("1.0.2-nightly.2"),
                to: "1.0.2",
                expected: vec![nightly_3, nightly_4, nightly_14],
            },
            Case {
                from: known("1.0.2-nightly.3"),
                to: "1.0.2",
                expected: vec![nightly_4, nightly_14],
            },
            Case {
                from: known("1.0.2-nightly.4"),
                to: "1.0.2",
                expected: vec![nightly_14],
            },
        ];

        for Case { from, to, expected } in cases {
            let result: Vec<_> = migrations_to_apply(from, &v(to))
                .iter()
                .map(|m| m.introduced_in())
                .collect();
            assert_eq!(result, *expected, "from {from:?} to {to}");
        }
    }
}
