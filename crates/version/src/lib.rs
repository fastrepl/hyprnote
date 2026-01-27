pub use semver::Version;

pub fn is_at_least(current: &Version, minimum: &Version) -> bool {
    current >= minimum
}

pub fn is_before(current: &Version, version: &Version) -> bool {
    current < version
}

pub fn is_in_range(current: &Version, from: &Version, to: &Version) -> bool {
    current >= from && current < to
}

pub fn is_in_range_inclusive(current: &Version, from: &Version, to: &Version) -> bool {
    current >= from && current <= to
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_at_least() {
        let v1_0_0 = Version::new(1, 0, 0);
        let v1_0_1 = Version::new(1, 0, 1);
        let v1_1_0 = Version::new(1, 1, 0);
        let v2_0_0 = Version::new(2, 0, 0);

        assert!(is_at_least(&v1_0_0, &v1_0_0));
        assert!(is_at_least(&v1_0_1, &v1_0_0));
        assert!(is_at_least(&v1_1_0, &v1_0_0));
        assert!(is_at_least(&v2_0_0, &v1_0_0));

        assert!(!is_at_least(&v1_0_0, &v1_0_1));
        assert!(!is_at_least(&v1_0_0, &v2_0_0));
    }

    #[test]
    fn test_is_before() {
        let v1_0_0 = Version::new(1, 0, 0);
        let v1_0_1 = Version::new(1, 0, 1);
        let v2_0_0 = Version::new(2, 0, 0);

        assert!(is_before(&v1_0_0, &v1_0_1));
        assert!(is_before(&v1_0_0, &v2_0_0));
        assert!(is_before(&v1_0_1, &v2_0_0));

        assert!(!is_before(&v1_0_0, &v1_0_0));
        assert!(!is_before(&v1_0_1, &v1_0_0));
        assert!(!is_before(&v2_0_0, &v1_0_0));
    }

    #[test]
    fn test_is_in_range() {
        let v1_0_0 = Version::new(1, 0, 0);
        let v1_0_1 = Version::new(1, 0, 1);
        let v1_0_2 = Version::new(1, 0, 2);
        let v1_1_0 = Version::new(1, 1, 0);
        let v2_0_0 = Version::new(2, 0, 0);

        assert!(is_in_range(&v1_0_1, &v1_0_0, &v1_0_2));
        assert!(is_in_range(&v1_0_0, &v1_0_0, &v1_0_2));
        assert!(is_in_range(&v1_0_1, &v1_0_0, &v2_0_0));
        assert!(is_in_range(&v1_1_0, &v1_0_0, &v2_0_0));

        assert!(!is_in_range(&v1_0_2, &v1_0_0, &v1_0_2));
        assert!(!is_in_range(&v2_0_0, &v1_0_0, &v2_0_0));
        assert!(!is_in_range(&v1_0_0, &v1_0_1, &v2_0_0));
    }

    #[test]
    fn test_is_in_range_inclusive() {
        let v1_0_0 = Version::new(1, 0, 0);
        let v1_0_1 = Version::new(1, 0, 1);
        let v1_0_2 = Version::new(1, 0, 2);
        let v2_0_0 = Version::new(2, 0, 0);

        assert!(is_in_range_inclusive(&v1_0_0, &v1_0_0, &v1_0_2));
        assert!(is_in_range_inclusive(&v1_0_1, &v1_0_0, &v1_0_2));
        assert!(is_in_range_inclusive(&v1_0_2, &v1_0_0, &v1_0_2));

        assert!(!is_in_range_inclusive(&v2_0_0, &v1_0_0, &v1_0_2));
        assert!(!is_in_range_inclusive(&v1_0_0, &v1_0_1, &v1_0_2));
    }

    #[test]
    fn test_with_prerelease() {
        let v1_0_0 = Version::new(1, 0, 0);
        let v1_0_0_alpha = Version::parse("1.0.0-alpha").unwrap();
        let v1_0_0_beta = Version::parse("1.0.0-beta").unwrap();

        assert!(is_before(&v1_0_0_alpha, &v1_0_0));
        assert!(is_before(&v1_0_0_beta, &v1_0_0));
        assert!(is_before(&v1_0_0_alpha, &v1_0_0_beta));

        assert!(is_at_least(&v1_0_0, &v1_0_0_alpha));
        assert!(is_at_least(&v1_0_0, &v1_0_0_beta));
    }
}
