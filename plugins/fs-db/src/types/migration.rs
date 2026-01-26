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

    pub fn run(&self, base_dir: &Path) -> Result<()> {
        (self.run)(base_dir)
    }
}

impl std::fmt::Debug for Migration {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Migration")
            .field("name", &self.name)
            .field("from", &self.from)
            .field("to", &self.to)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn noop(_base_dir: &Path) -> Result<()> {
        Ok(())
    }

    #[test]
    fn migration_creation() {
        let m = Migration::new(
            "test_migration",
            Version::parse("1.0.1").unwrap(),
            Version::parse("1.0.2").unwrap(),
            noop,
        );

        assert_eq!(m.name, "test_migration");
        assert_eq!(m.from, Version::parse("1.0.1").unwrap());
        assert_eq!(m.to, Version::parse("1.0.2").unwrap());
    }

    #[test]
    fn migration_run() {
        use std::sync::atomic::{AtomicBool, Ordering};
        static CALLED: AtomicBool = AtomicBool::new(false);

        fn test_run(_base_dir: &Path) -> Result<()> {
            CALLED.store(true, Ordering::SeqCst);
            Ok(())
        }

        let m = Migration::new(
            "test",
            Version::parse("1.0.1").unwrap(),
            Version::parse("1.0.2").unwrap(),
            test_run,
        );

        let temp = tempfile::TempDir::new().unwrap();
        m.run(temp.path()).unwrap();
        assert!(CALLED.load(Ordering::SeqCst));
    }
}
