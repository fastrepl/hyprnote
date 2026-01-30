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

    let mut migrations = all_migrations();
    migrations.sort_by(|a, b| a.introduced_in().cmp(b.introduced_in()));

    migrations
        .into_iter()
        .filter(|m| current < *m.introduced_in() && *m.introduced_in() <= *to)
        .collect()
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
        let to_uuid_folder =
            super::super::v1_0_2_nightly_6_move_uuid_folders::Migrate.introduced_in();
        let rename_transcript =
            super::super::v1_0_2_nightly_6_rename_transcript::Migrate.introduced_in();
        let v1_sqlite =
            super::super::v1_0_2_nightly_14_extract_from_sqlite::Migrate.introduced_in();

        struct Case {
            from: DetectedVersion,
            to: &'static str,
            expected: Vec<&'static Version>,
        }

        let cases: &[Case] = &[
            // Unlikely any nightly.3 users are updating to nightly.15,
            // but we did some uuid/transcript cleanup, so this is just a precaution.
            Case {
                from: known("1.0.2-nightly.3"),
                to: "1.0.2-nightly.15",
                expected: vec![to_uuid_folder, rename_transcript, v1_sqlite],
            },
            // 1.0.2-nightly.14 is empty release, so 0 users upgrading from it
            Case {
                from: known("1.0.2-nightly.14"),
                to: "1.0.2-nightly.15",
                expected: vec![],
            },
            // 1.0.2-nightly.1x users already had data replicated to the filesystem,
            // so the v1_sqlite migration is just a safeguard because the `load` call was removed from the frontend local persister in 1.0.2-nightly.15
            Case {
                from: known("1.0.2-nightly.10"),
                to: "1.0.2-nightly.15",
                expected: vec![v1_sqlite],
            },
            Case {
                from: known("1.0.2-nightly.13"),
                to: "1.0.2-nightly.15",
                expected: vec![v1_sqlite],
            },
            // No need to run v1_sqlite going forward.
            // It's safe to rerun v1_sqlite as long as we don't diverge from the data structure it generates.
            Case {
                from: known("1.0.2-nightly.15"),
                to: "1.0.2-nightly.16",
                expected: vec![],
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
