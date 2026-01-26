use std::path::Path;

use crate::Result;

pub use semver::Version;

const VERSION_FILE: &str = ".schema/version";
const SQLITE_FILE: &str = "db.sqlite";
const LEGACY_VERSION: &str = "1.0.1";

pub fn read_current_version(base_dir: &Path) -> Result<Option<Version>> {
    let version_path = base_dir.join(VERSION_FILE);
    let sqlite_path = base_dir.join(SQLITE_FILE);

    if version_path.exists() {
        let content = std::fs::read_to_string(&version_path)?;
        let version = Version::parse(content.trim())
            .map_err(|_| crate::Error::VersionParse(content.clone()))?;
        Ok(Some(version))
    } else if sqlite_path.exists() {
        let version = Version::parse(LEGACY_VERSION).unwrap();
        Ok(Some(version))
    } else {
        Ok(None)
    }
}

pub fn write_version(base_dir: &Path, version: &Version) -> Result<()> {
    let version_path = base_dir.join(VERSION_FILE);
    if let Some(parent) = version_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&version_path, version.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn fresh_install_returns_none() {
        let temp = TempDir::new().unwrap();
        let result = read_current_version(temp.path()).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn existing_version_file_returns_version() {
        let temp = TempDir::new().unwrap();
        std::fs::create_dir_all(temp.path().join(".schema")).unwrap();
        std::fs::write(temp.path().join(VERSION_FILE), "1.0.2").unwrap();

        let result = read_current_version(temp.path()).unwrap();
        assert_eq!(result, Some(Version::parse("1.0.2").unwrap()));
    }

    #[test]
    fn sqlite_without_version_returns_legacy() {
        let temp = TempDir::new().unwrap();
        std::fs::write(temp.path().join(SQLITE_FILE), "").unwrap();

        let result = read_current_version(temp.path()).unwrap();
        assert_eq!(result, Some(Version::parse(LEGACY_VERSION).unwrap()));
    }

    #[test]
    fn write_and_read_version() {
        let temp = TempDir::new().unwrap();
        let version = Version::parse("1.2.3").unwrap();

        write_version(temp.path(), &version).unwrap();
        let result = read_current_version(temp.path()).unwrap();

        assert_eq!(result, Some(version));
    }

    #[test]
    fn version_ordering() {
        let v1 = Version::parse("1.0.1").unwrap();
        let v2 = Version::parse("1.0.2").unwrap();
        let v3 = Version::parse("1.0.10").unwrap();

        assert!(v1 < v2);
        assert!(v2 < v3);
        assert!(v1 < v3);
    }
}
