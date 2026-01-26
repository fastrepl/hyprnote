use semver::Version;

use crate::{Migration, MigrationRunner, migrations, version};

use super::fixtures::{AppVersion, SessionFixture, VersionedFixture};

fn v(s: &str) -> Version {
    Version::parse(s).unwrap()
}

fn noop(_: &std::path::Path) -> crate::Result<()> {
    Ok(())
}

#[test]
fn fresh_install_skips_all_migrations() {
    let fixture = VersionedFixture::new_fresh().unwrap();
    let migrations = [
        Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
        Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
    ];

    let runner = MigrationRunner::new(fixture.path(), v("1.0.3"), &migrations);
    let report = runner.run().unwrap();

    assert_eq!(report.migrations_applied.len(), 0);
    assert_eq!(report.to_version, "1.0.3");

    let stored = fixture.read_version().unwrap();
    assert_eq!(stored, "1.0.3");
}

#[test]
fn old_user_without_version_file_but_has_sqlite() {
    let fixture = VersionedFixture::new_with_sqlite().unwrap();
    let migrations = [
        Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
        Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
    ];

    let runner = MigrationRunner::new(fixture.path(), v("1.0.3"), &migrations);
    let report = runner.run().unwrap();

    assert_eq!(report.from_version, "1.0.1");
    assert_eq!(report.migrations_applied.len(), 2);
}

#[test]
fn user_on_1_0_1_upgrading_to_1_0_3() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_1).unwrap();
    let migrations = [
        Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
        Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
    ];

    let runner = MigrationRunner::new(fixture.path(), v("1.0.3"), &migrations);
    let report = runner.run().unwrap();

    assert_eq!(report.from_version, "1.0.1");
    assert_eq!(report.to_version, "1.0.3");
    assert_eq!(report.migrations_applied.len(), 2);
}

#[test]
fn user_on_1_0_2_upgrading_to_1_0_3() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_2).unwrap();
    let migrations = [
        Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
        Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
    ];

    let runner = MigrationRunner::new(fixture.path(), v("1.0.3"), &migrations);
    let report = runner.run().unwrap();

    assert_eq!(report.from_version, "1.0.2");
    assert_eq!(report.to_version, "1.0.3");
    assert_eq!(report.migrations_applied.len(), 1);
    assert!(report.migrations_applied[0].contains("m2"));
}

#[test]
fn user_already_on_latest() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_2).unwrap();
    version::write_version(fixture.path(), &v("1.0.3")).unwrap();

    let migrations = [
        Migration::new("m1", v("1.0.1"), v("1.0.2"), noop),
        Migration::new("m2", v("1.0.2"), v("1.0.3"), noop),
    ];

    let runner = MigrationRunner::new(fixture.path(), v("1.0.3"), &migrations);
    let report = runner.run().unwrap();

    assert_eq!(report.from_version, "1.0.3");
    assert_eq!(report.to_version, "1.0.3");
    assert_eq!(report.migrations_applied.len(), 0);
}

#[test]
fn migrate_v1_0_1_rename_transcript() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_1).unwrap();
    let session = SessionFixture::sample_with_transcript();
    let session_id = session.id.clone();
    fixture.with_session(session).unwrap();

    assert!(fixture.file_exists(&format!("{}/_transcript.json", session_id)));
    assert!(!fixture.file_exists(&format!("{}/transcript.json", session_id)));

    migrations::rename_transcript(fixture.path()).unwrap();

    assert!(!fixture.file_exists(&format!("{}/_transcript.json", session_id)));
    assert!(fixture.file_exists(&format!("{}/transcript.json", session_id)));
}

#[test]
fn migrate_v1_0_1_move_uuid_folders_to_sessions() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_1).unwrap();
    let session = SessionFixture::sample_meeting();
    let session_id = session.id.clone();
    fixture.with_session(session).unwrap();

    assert!(fixture.file_exists(&format!("{}/_meta.json", session_id)));
    assert!(!fixture.file_exists(&format!("sessions/{}/_meta.json", session_id)));

    migrations::move_uuid_folders_to_sessions(fixture.path()).unwrap();

    assert!(!fixture.file_exists(&format!("{}/_meta.json", session_id)));
    assert!(fixture.file_exists(&format!("sessions/{}/_meta.json", session_id)));
}

#[test]
fn migrate_v1_0_1_full_migration() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_1).unwrap();

    let session_with_transcript = SessionFixture::sample_with_transcript();
    let transcript_session_id = session_with_transcript.id.clone();
    fixture.with_session(session_with_transcript).unwrap();

    let simple_session = SessionFixture::sample_meeting();
    let simple_session_id = simple_session.id.clone();
    fixture.with_session(simple_session).unwrap();

    assert!(fixture.file_exists(&format!("{}/_transcript.json", transcript_session_id)));
    assert!(fixture.file_exists(&format!("{}/_meta.json", simple_session_id)));
    assert!(!fixture.file_exists("sessions"));

    migrations::move_uuid_folders_to_sessions(fixture.path()).unwrap();
    migrations::rename_transcript(fixture.path()).unwrap();

    assert!(fixture.file_exists(&format!("sessions/{}/_meta.json", transcript_session_id)));
    assert!(fixture.file_exists(&format!(
        "sessions/{}/transcript.json",
        transcript_session_id
    )));
    assert!(!fixture.file_exists(&format!(
        "sessions/{}/_transcript.json",
        transcript_session_id
    )));
    assert!(fixture.file_exists(&format!("sessions/{}/_meta.json", simple_session_id)));
}

#[test]
fn migrate_v1_0_1_handles_both_transcript_formats() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_1).unwrap();
    let session = SessionFixture::sample_with_transcript();
    let session_id = session.id.clone();
    fixture.with_session(session).unwrap();

    std::fs::write(
        fixture.path().join(&session_id).join("transcript.json"),
        r#"{"transcripts":[]}"#,
    )
    .unwrap();

    assert!(fixture.file_exists(&format!("{}/_transcript.json", session_id)));
    assert!(fixture.file_exists(&format!("{}/transcript.json", session_id)));

    migrations::rename_transcript(fixture.path()).unwrap();

    assert!(!fixture.file_exists(&format!("{}/_transcript.json", session_id)));
    assert!(fixture.file_exists(&format!("{}/transcript.json", session_id)));
}

#[test]
fn migrate_v1_0_2_no_changes_needed() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_2).unwrap();
    let session = SessionFixture::sample_with_transcript();
    let session_id = session.id.clone();
    fixture.with_session(session).unwrap();

    assert!(fixture.file_exists(&format!("sessions/{}/transcript.json", session_id)));
    assert!(!fixture.file_exists(&format!("sessions/{}/_transcript.json", session_id)));

    migrations::rename_transcript(fixture.path()).unwrap();
    migrations::move_uuid_folders_to_sessions(fixture.path()).unwrap();

    assert!(fixture.file_exists(&format!("sessions/{}/transcript.json", session_id)));
}

#[test]
fn migrate_v1_0_1_to_1_0_2_with_runner() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_1).unwrap();
    let session = SessionFixture::sample_with_transcript();
    fixture.with_session(session).unwrap();

    let migrations = migrations::all_migrations();
    let runner = MigrationRunner::new(fixture.path(), v("1.0.2"), &migrations);
    let report = runner.run().unwrap();

    assert_eq!(report.from_version, "1.0.1");
    assert_eq!(report.to_version, "1.0.2");
    assert_eq!(report.migrations_applied.len(), 1);

    let version = fixture.read_version().unwrap();
    assert_eq!(version, "1.0.2");
}

#[test]
fn migrate_v1_0_2_already_current() {
    let fixture = VersionedFixture::new(AppVersion::V1_0_2).unwrap();
    let session = SessionFixture::sample_with_transcript();
    fixture.with_session(session).unwrap();

    let migrations = migrations::all_migrations();
    let runner = MigrationRunner::new(fixture.path(), v("1.0.2"), &migrations);
    let report = runner.run().unwrap();

    assert_eq!(report.from_version, "1.0.2");
    assert_eq!(report.to_version, "1.0.2");
    assert_eq!(report.migrations_applied.len(), 0);
}
