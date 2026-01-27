use std::fmt;
use std::ops::Deref;

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct BaseVersion {
    pub major: u64,
    pub minor: u64,
    pub patch: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Version(semver::Version);

impl Version {
    pub const fn new(major: u64, minor: u64, patch: u64) -> Self {
        Self(semver::Version::new(major, minor, patch))
    }

    pub fn parse(text: &str) -> Result<Self, semver::Error> {
        semver::Version::parse(text).map(Self)
    }

    pub fn base(&self) -> BaseVersion {
        BaseVersion {
            major: self.0.major,
            minor: self.0.minor,
            patch: self.0.patch,
        }
    }
}

impl Deref for Version {
    type Target = semver::Version;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl fmt::Display for Version {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    macro_rules! test_order {
        ($name:ident: $($version:literal),+ $(,)?) => {
            #[test]
            fn $name() {
                let versions = [$($version),+];
                for i in 0..versions.len() {
                    for j in (i + 1)..versions.len() {
                        let left = Version::parse(versions[i]).unwrap();
                        let right = Version::parse(versions[j]).unwrap();
                        assert!(
                            left < right,
                            "Expected {} < {}, but got {} >= {}",
                            versions[i], versions[j], versions[i], versions[j]
                        );
                    }
                }
            }
        };
    }

    test_order!(basic_semver: "1.0.0", "1.0.1", "1.1.0", "2.0.0");

    test_order!(prerelease_vs_release: "1.0.0-alpha", "1.0.0-beta", "1.0.0-rc.1", "1.0.0");

    test_order!(numeric_prerelease_identifiers: "1.0.0-pre.1", "1.0.0-pre.2", "1.0.0-pre.10", "1.0.0-pre.100");

    test_order!(nightly_releases: "1.0.0-nightly.1", "1.0.0-nightly.2", "1.0.0-nightly.10", "1.0.0-nightly.32", "1.0.0");

    test_order!(
        nightly_across_patches:
        "1.0.0-nightly.1",
        "1.0.0-nightly.32",
        "1.0.0",
        "1.0.1-nightly.1",
        "1.0.1-nightly.4",
        "1.0.1",
        "1.0.2-nightly.1",
        "1.0.2-nightly.12",
    );

    test_order!(
        dev_builds_extend_prerelease:
        "1.0.2-nightly.12",
        "1.0.2-nightly.12.dev.1",
        "1.0.2-nightly.12.dev.100",
        "1.0.2-nightly.12.dev.5169",
        "1.0.2-nightly.13",
    );

    test_order!(
        full_release_cycle:
        "1.0.1",
        "1.0.2-nightly.1",
        "1.0.2-nightly.1.dev.10",
        "1.0.2-nightly.1.dev.100",
        "1.0.2-nightly.2",
        "1.0.2-nightly.12",
        "1.0.2-nightly.12.dev.1",
        "1.0.2-nightly.12.dev.5169",
        "1.0.2-nightly.13",
        "1.0.2",
        "1.0.3-nightly.1",
    );

    test_order!(string_vs_numeric_identifiers: "1.0.0-1", "1.0.0-2", "1.0.0-10", "1.0.0-alpha", "1.0.0-beta");

    test_order!(longer_prerelease_is_greater: "1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.1.beta");

    #[test]
    fn build_metadata_comparison() {
        let base = Version::parse("1.0.2-nightly.12.dev.5169").unwrap();
        let with_meta = Version::parse("1.0.2-nightly.12.dev.5169+8797281").unwrap();
        let with_other_meta = Version::parse("1.0.2-nightly.12.dev.5169+abcdef0").unwrap();

        assert!(base < with_meta);
        assert!(with_meta < with_other_meta);
    }

    #[test]
    fn real_world_staging_build() {
        let nightly_tag = Version::parse("1.0.2-nightly.12").unwrap();
        let staging_build = Version::parse("1.0.2-nightly.12.dev.5169+8797281").unwrap();
        let next_nightly = Version::parse("1.0.2-nightly.13").unwrap();
        let stable = Version::parse("1.0.2").unwrap();

        assert!(nightly_tag < staging_build);
        assert!(staging_build < next_nightly);
        assert!(next_nightly < stable);
    }

    #[test]
    fn base_version_strips_prerelease_and_build() {
        let release = Version::parse("1.0.2").unwrap();
        let prerelease = Version::parse("1.0.2-nightly.12").unwrap();
        let dev_build = Version::parse("1.0.2-nightly.12.dev.5169+8797281").unwrap();

        let expected = BaseVersion {
            major: 1,
            minor: 0,
            patch: 2,
        };
        assert_eq!(release.base(), expected);
        assert_eq!(prerelease.base(), expected);
        assert_eq!(dev_build.base(), expected);
    }

    #[test]
    fn base_version_comparison() {
        let v1 = Version::new(1, 0, 2);
        let v2 = Version::parse("1.0.2-nightly.12.dev.5169+8797281").unwrap();
        let v3 = Version::new(1, 0, 3);

        assert_eq!(v1.base(), v2.base());
        assert!(v1.base() < v3.base());
        assert!(v2.base() < v3.base());
    }
}
