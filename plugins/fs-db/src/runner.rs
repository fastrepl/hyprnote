use std::path::Path;

use semver::Version;

use crate::{Migration, MigrationReport, Result, version};

pub struct MigrationRunner<'a> {
    base_dir: &'a Path,
    app_version: Version,
    migrations: &'a [Migration],
}

impl<'a> MigrationRunner<'a> {
    pub fn new(base_dir: &'a Path, app_version: Version, migrations: &'a [Migration]) -> Self {
        Self {
            base_dir,
            app_version,
            migrations,
        }
    }

    pub fn run(&self) -> Result<MigrationReport> {
        let current_version = version::read_current_version(self.base_dir)?;

        match current_version {
            None => {
                version::write_version(self.base_dir, &self.app_version)?;
                Ok(MigrationReport {
                    from_version: self.app_version.to_string(),
                    to_version: self.app_version.to_string(),
                    migrations_applied: Vec::new(),
                })
            }
            Some(current) => {
                let pending = self.collect_pending_migrations(&current);
                let mut applied = Vec::new();

                for migration in pending {
                    migration.run(self.base_dir)?;
                    applied.push(format!(
                        "{}: {} -> {}",
                        migration.name, migration.from, migration.to
                    ));
                }

                version::write_version(self.base_dir, &self.app_version)?;

                Ok(MigrationReport {
                    from_version: current.to_string(),
                    to_version: self.app_version.to_string(),
                    migrations_applied: applied,
                })
            }
        }
    }

    fn collect_pending_migrations(&self, current_version: &Version) -> Vec<&Migration> {
        let mut pending: Vec<_> = self
            .migrations
            .iter()
            .filter(|m| m.from >= *current_version && m.to <= self.app_version)
            .collect();
        pending.sort_by(|a, b| a.from.cmp(&b.from));
        pending
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn noop(_base_dir: &Path) -> Result<()> {
        Ok(())
    }

    fn v(s: &str) -> Version {
        Version::parse(s).unwrap()
    }

    #[test]
    fn fresh_install_skips_all_migrations() {
        let temp = TempDir::new().unwrap();
        let migrations = [
            Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
            Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
        ];

        let runner = MigrationRunner::new(temp.path(), v("1.0.3"), &migrations);
        let report = runner.run().unwrap();

        assert_eq!(report.migrations_applied.len(), 0);
        assert_eq!(report.to_version, "1.0.3");

        let stored = version::read_current_version(temp.path()).unwrap();
        assert_eq!(stored, Some(v("1.0.3")));
    }

    #[test]
    fn old_user_without_version_file_but_has_sqlite() {
        let temp = TempDir::new().unwrap();
        std::fs::write(temp.path().join("db.sqlite"), "").unwrap();

        let migrations = [
            Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
            Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
        ];

        let runner = MigrationRunner::new(temp.path(), v("1.0.3"), &migrations);
        let report = runner.run().unwrap();

        assert_eq!(report.from_version, "1.0.1");
        assert_eq!(report.migrations_applied.len(), 2);
    }

    #[test]
    fn user_on_1_0_1_upgrading_to_1_0_3() {
        let temp = TempDir::new().unwrap();
        version::write_version(temp.path(), &v("1.0.1")).unwrap();

        let migrations = [
            Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
            Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
        ];

        let runner = MigrationRunner::new(temp.path(), v("1.0.3"), &migrations);
        let report = runner.run().unwrap();

        assert_eq!(report.from_version, "1.0.1");
        assert_eq!(report.to_version, "1.0.3");
        assert_eq!(report.migrations_applied.len(), 2);
    }

    #[test]
    fn user_on_1_0_2_upgrading_to_1_0_3() {
        let temp = TempDir::new().unwrap();
        version::write_version(temp.path(), &v("1.0.2")).unwrap();

        let migrations = [
            Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
            Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
        ];

        let runner = MigrationRunner::new(temp.path(), v("1.0.3"), &migrations);
        let report = runner.run().unwrap();

        assert_eq!(report.from_version, "1.0.2");
        assert_eq!(report.to_version, "1.0.3");
        assert_eq!(report.migrations_applied.len(), 1);
        assert!(report.migrations_applied[0].contains("m2"));
    }

    #[test]
    fn user_already_on_latest() {
        let temp = TempDir::new().unwrap();
        version::write_version(temp.path(), &v("1.0.3")).unwrap();

        let migrations = [
            Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
            Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
        ];

        let runner = MigrationRunner::new(temp.path(), v("1.0.3"), &migrations);
        let report = runner.run().unwrap();

        assert_eq!(report.from_version, "1.0.3");
        assert_eq!(report.to_version, "1.0.3");
        assert_eq!(report.migrations_applied.len(), 0);
    }

    #[test]
    fn migrations_run_in_order() {
        use std::sync::atomic::{AtomicUsize, Ordering};
        static COUNTER: AtomicUsize = AtomicUsize::new(0);
        static ORDER: [AtomicUsize; 2] = [AtomicUsize::new(0), AtomicUsize::new(0)];

        fn first(_: &Path) -> Result<()> {
            ORDER[0].store(COUNTER.fetch_add(1, Ordering::SeqCst), Ordering::SeqCst);
            Ok(())
        }

        fn second(_: &Path) -> Result<()> {
            ORDER[1].store(COUNTER.fetch_add(1, Ordering::SeqCst), Ordering::SeqCst);
            Ok(())
        }

        let temp = TempDir::new().unwrap();
        version::write_version(temp.path(), &v("1.0.1")).unwrap();

        let migrations = [
            Migration::new("second", v("1.0.2"), v("1.0.3"), second),
            Migration::new("first", v("1.0.1"), v("1.0.2"), first),
        ];

        let runner = MigrationRunner::new(temp.path(), v("1.0.3"), &migrations);
        runner.run().unwrap();

        assert!(ORDER[0].load(Ordering::SeqCst) < ORDER[1].load(Ordering::SeqCst));
    }
}
