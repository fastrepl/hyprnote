use crate::{Error, Result};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Deserialize, JsonSchema)]
pub struct ImportRecordingInput {
    pub file_path: String,
    pub title: Option<String>,
    pub folder_path: Option<String>,
    /// Reuse this key when retrying submission. A different request needs a new key.
    pub request_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, sqlx::FromRow)]
pub struct RecordingImport {
    pub job_id: String,
    pub meeting_id: String,
    pub processing_status: String,
    pub summary_status: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Deserialize, JsonSchema)]
pub struct GetRecordingImportInput {
    pub job_id: String,
}

fn database(source: sqlx::Error) -> Error {
    Error::Database {
        action: "recording import (open the updated desktop app first)",
        source,
    }
}
fn file_error(error: std::io::Error) -> Error {
    Error::Invalid(format!("Recording file: {error}"))
}

pub async fn get_recording_import(pool: &SqlitePool, job_id: &str) -> Result<RecordingImport> {
    sqlx::query_as("SELECT id AS job_id, meeting_id, processing_status, summary_status, error FROM local_recording_import_jobs WHERE id = ?")
        .bind(job_id).fetch_optional(pool).await.map_err(database)?
        .ok_or_else(|| Error::NotFound("recording import".into()))
}

async fn database_file(pool: &SqlitePool) -> Result<PathBuf> {
    let file: String =
        sqlx::query_scalar("SELECT file FROM pragma_database_list WHERE name = 'main'")
            .fetch_one(pool)
            .await
            .map_err(database)?;
    if file.is_empty() {
        return Err(Error::Invalid(
            "Recording imports require a file-backed database".into(),
        ));
    }
    Ok(PathBuf::from(file))
}

fn staging_directory(vault: &Path, database: &Path) -> Result<PathBuf> {
    if !vault.is_absolute() {
        return Err(Error::Invalid(
            "Desktop recording storage path is unavailable".into(),
        ));
    }
    let database = std::fs::canonicalize(database).map_err(file_error)?;
    let mut hash = Sha256::new();
    #[cfg(unix)]
    {
        use std::os::unix::ffi::OsStrExt;
        hash.update(database.as_os_str().as_bytes());
    }
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        for unit in database.as_os_str().encode_wide() {
            hash.update(unit.to_le_bytes());
        }
    }
    let namespace: String = hash
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    let mut directory = std::fs::canonicalize(vault).map_err(file_error)?;
    // This directory is exclusively owned by this staging protocol. Do not sweep
    // recordings made by older versions or files elsewhere in the vault.
    for component in ["recording-imports", ".staging-v1", &namespace] {
        directory.push(component);
        match std::fs::create_dir(&directory) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
            Err(error) => return Err(file_error(error)),
        }
        if !std::fs::symlink_metadata(&directory)
            .map_err(file_error)?
            .file_type()
            .is_dir()
        {
            return Err(Error::Invalid(
                "Recording staging path must be a directory, not a symlink".into(),
            ));
        }
    }
    Ok(directory)
}

fn staging_lock(directory: &Path) -> Result<std::fs::File> {
    let path = directory.join(".lock");
    if let Ok(metadata) = std::fs::symlink_metadata(&path)
        && !metadata.file_type().is_file()
    {
        return Err(Error::Invalid(
            "Recording staging lock must be a regular file".into(),
        ));
    }
    std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(path)
        .map_err(file_error)
}

pub async fn cleanup_recording_imports(pool: &SqlitePool, vault_path: &str) -> Result<()> {
    let database_path = database_file(pool).await?;
    let pool = pool.clone();
    let vault = PathBuf::from(vault_path);
    tokio::task::spawn_blocking(move || {
        let directory = staging_directory(&vault, &database_path)?;
        let lock = staging_lock(&directory)?;
        match lock.try_lock() {
            Ok(()) => {}
            Err(std::fs::TryLockError::WouldBlock) => return Ok(()),
            Err(std::fs::TryLockError::Error(error)) => return Err(file_error(error)),
        }
        tokio::runtime::Handle::current().block_on(async {
            // A cancelled submitter may have released its file lock while its
            // SQLite commit is still running. Fence cleanup behind that commit.
            let mut tx = pool.begin_with("BEGIN IMMEDIATE").await.map_err(database)?;
            let referenced: std::collections::HashSet<String> = sqlx::query_scalar(
                "SELECT file_path FROM local_recording_import_jobs WHERE file_path != ''",
            )
            .fetch_all(&mut *tx)
            .await
            .map_err(database)?
            .into_iter()
            .collect();
            for entry in std::fs::read_dir(&directory).map_err(file_error)? {
                let entry = entry.map_err(file_error)?;
                let path = entry.path();
                if !entry.file_type().map_err(file_error)?.is_file()
                    || path
                        .file_stem()
                        .and_then(|value| value.to_str())
                        .and_then(|value| uuid::Uuid::parse_str(value).ok())
                        .is_none()
                    || !path
                        .extension()
                        .and_then(|value| value.to_str())
                        .is_some_and(|value| {
                            ["wav", "mp3", "ogg", "mp4", "m4a", "flac", "webm", "aac"]
                                .contains(&value)
                        })
                    || referenced.contains(path.to_string_lossy().as_ref())
                {
                    continue;
                }
                match std::fs::remove_file(path) {
                    Ok(()) => {}
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                    Err(error) => return Err(file_error(error)),
                }
            }
            tx.rollback().await.map_err(database)
        })
    })
    .await
    .map_err(|_| Error::Invalid("Recording cleanup was interrupted".into()))?
}

pub async fn import_recording(
    pool: &SqlitePool,
    input: ImportRecordingInput,
) -> Result<RecordingImport> {
    if let Some(key) = &input.request_key {
        if key.is_empty() || key.len() > 200 {
            return Err(Error::Invalid(
                "request_key must contain 1–200 bytes".into(),
            ));
        }
        if let Some(id) = sqlx::query_scalar::<_, String>(
            "SELECT id FROM local_recording_import_jobs WHERE request_key = ?",
        )
        .bind(key)
        .fetch_optional(pool)
        .await
        .map_err(database)?
        {
            return get_recording_import(pool, &id).await;
        }
    }
    let disabled: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM managed_app_settings WHERE id = 'intelligence_disabled' AND value_json = 'true')")
        .fetch_one(pool).await.map_err(database)?;
    if disabled {
        return Err(Error::Invalid(
            "Recording import is unavailable while managed intelligence is disabled".into(),
        ));
    }
    let vault: Option<String> = sqlx::query_scalar("SELECT vault_path FROM local_recording_import_worker WHERE updated_at > unixepoch() - 15 AND vault_path != '' ORDER BY updated_at DESC LIMIT 1")
        .fetch_optional(pool).await.map_err(database)?;
    let vault = vault.ok_or_else(|| {
        Error::Invalid("Open the updated Anarlog desktop app before importing recordings".into())
    })?;
    let source = tokio::fs::canonicalize(&input.file_path)
        .await
        .map_err(file_error)?;
    let extension = source
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !["wav", "mp3", "ogg", "mp4", "m4a", "flac", "webm", "aac"].contains(&extension.as_str()) {
        return Err(Error::Invalid("Unsupported recording format".into()));
    }
    if !tokio::fs::metadata(&source)
        .await
        .map_err(file_error)?
        .is_file()
    {
        return Err(Error::Invalid("Recording must be a regular file".into()));
    }
    let file = tokio::fs::File::open(&source).await.map_err(file_error)?;
    let metadata = file.metadata().await.map_err(file_error)?;
    if !metadata.is_file() || metadata.len() == 0 {
        return Err(Error::Invalid(
            "Recording must be a nonempty regular file".into(),
        ));
    }
    let folder = input.folder_path.unwrap_or_default();
    if !folder.is_empty() {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM folders WHERE path = ? AND deleted_at IS NULL)",
        )
        .bind(&folder)
        .fetch_one(pool)
        .await
        .map_err(database)?;
        if !exists {
            return Err(Error::Invalid(
                "Folder does not exist; use meetings folders to choose an existing folder".into(),
            ));
        }
    }
    let database_path = database_file(pool).await?;
    let (dir, _staging_lock) = tokio::task::spawn_blocking(move || {
        let directory = staging_directory(Path::new(&vault), &database_path)?;
        let lock = staging_lock(&directory)?;
        lock.lock().map_err(file_error)?;
        Ok::<_, Error>((directory, lock))
    })
    .await
    .map_err(|_| Error::Invalid("Recording staging was interrupted".into()))??;
    let id = uuid::Uuid::new_v4().to_string();
    let staged = dir.join(format!("{id}.{extension}"));
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    // Open synchronously while holding the lock: a cancelled async open could
    // otherwise create its file after cleanup has already finished.
    let mut output = tokio::fs::File::from_std(options.open(&staged).map_err(file_error)?);
    let copy = tokio::io::copy(&mut { file }, &mut output).await;
    if let Err(error) = copy {
        let _ = tokio::fs::remove_file(&staged).await;
        return Err(file_error(error));
    }
    if let Err(error) = output.sync_all().await {
        drop(output);
        let _ = tokio::fs::remove_file(&staged).await;
        return Err(file_error(error));
    }
    drop(output);
    let title = input.title.unwrap_or_else(|| {
        source
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned()
    });
    let result = async {
        let mut tx = pool.begin_with("BEGIN IMMEDIATE").await.map_err(database)?;
        if let Some(key) = &input.request_key
            && let Some(existing) = sqlx::query_scalar::<_, String>("SELECT id FROM local_recording_import_jobs WHERE request_key = ?")
                .bind(key).fetch_optional(&mut *tx).await.map_err(database)? {
                tx.rollback().await.map_err(database)?;
                return Ok(existing);
        }
        let now: String = sqlx::query_scalar("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')").fetch_one(&mut *tx).await.map_err(database)?;
        anlg_db_app::insert_session(&mut tx, &id, &title, "", "", &folder, &now).await.map_err(database)?;
        anlg_db_app::insert_empty_session_note(&mut tx, &id, "", &now).await.map_err(database)?;
        anlg_db_app::upsert_session_owner_human(&mut tx, &id, &now).await.map_err(database)?;
        anlg_db_app::insert_owner_session_participant(&mut tx, &uuid::Uuid::new_v4().to_string(), &id, &now).await.map_err(database)?;
        sqlx::query("INSERT INTO local_recording_import_jobs (id, meeting_id, request_key, file_path, updated_at) VALUES (?, ?, ?, ?, unixepoch())")
            .bind(&id).bind(&id).bind(&input.request_key).bind(staged.to_string_lossy().as_ref()).execute(&mut *tx).await.map_err(database)?;
        tx.commit().await.map_err(database)?;
        Ok::<_, Error>(id.clone())
    }.await;
    if result.as_ref().map_or(true, |existing| existing != &id) {
        let _ = tokio::fs::remove_file(&staged).await;
    }
    get_recording_import(pool, &result?).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn concurrent_retries_create_one_meeting_and_keep_a_private_copy() {
        let dir = tempfile::tempdir().unwrap();
        let db = anlg_db_core::Db::connect_local_plain(dir.path().join("app.db"))
            .await
            .unwrap();
        anlg_db_app::prepare_schema(&db).await.unwrap();
        sqlx::query("INSERT INTO local_recording_import_worker (id, vault_path, updated_at) VALUES ('desktop', ?, unixepoch())")
            .bind(dir.path().to_string_lossy().as_ref())
            .execute(db.pool())
            .await
            .unwrap();
        sqlx::query("INSERT INTO folders (id, path) VALUES ('research', 'Research')")
            .execute(db.pool())
            .await
            .unwrap();
        let file = dir.path().join("Recording.wav");
        tokio::fs::write(&file, b"recording content").await.unwrap();
        let input = ImportRecordingInput {
            file_path: file.to_string_lossy().into_owned(),
            title: Some("Imported meeting".into()),
            folder_path: Some("Research".into()),
            request_key: Some("pipeline-1".into()),
        };
        let (a, b) = tokio::join!(
            import_recording(db.pool(), input.clone()),
            import_recording(db.pool(), input)
        );
        let a = a.unwrap();
        assert_eq!(a.job_id, b.unwrap().job_id);
        assert_eq!(a.processing_status, "queued");
        let meeting = crate::get_meeting(
            db.pool(),
            crate::GetMeetingInput {
                meeting_id: a.meeting_id.clone(),
            },
        )
        .await
        .unwrap();
        assert_eq!(meeting.title, "Imported meeting");
        assert!(meeting.note.is_some());
        assert_eq!(meeting.folder_path.as_deref(), Some("Research"));
        let local = local_meeting(db.pool(), meeting).await.unwrap();
        assert_eq!(local.processing_status.as_deref(), Some("queued"));
        assert_eq!(local.recording_import.unwrap().job_id, a.job_id);
        let count: i64 = sqlx::query_scalar("SELECT count(*) FROM sessions")
            .fetch_one(db.pool())
            .await
            .unwrap();
        assert_eq!(count, 1);
        tokio::fs::remove_file(&file).await.unwrap();
        let staged: String =
            sqlx::query_scalar("SELECT file_path FROM local_recording_import_jobs")
                .fetch_one(db.pool())
                .await
                .unwrap();
        assert_eq!(
            tokio::fs::read(&staged).await.unwrap(),
            b"recording content"
        );
        assert_eq!(
            std::fs::read_dir(Path::new(&staged).parent().unwrap())
                .unwrap()
                .filter(|entry| entry.as_ref().unwrap().file_name() != ".lock")
                .count(),
            1
        );
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                std::fs::metadata(&staged).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
        db.pool().close().await;
    }

    #[tokio::test]
    async fn interrupted_submissions_are_cleaned_without_touching_other_audio() {
        const CHILD_VAULT: &str = "ANARLOG_IMPORT_INTERRUPTION_TEST_VAULT";
        if let Some(vault) = std::env::var_os(CHILD_VAULT) {
            let vault = PathBuf::from(vault);
            let pool = sqlx::SqlitePool::connect_with(
                sqlx::sqlite::SqliteConnectOptions::new().filename(vault.join("app.db")),
            )
            .await
            .unwrap();
            import_recording(
                &pool,
                ImportRecordingInput {
                    file_path: vault.join("source.wav").to_string_lossy().into_owned(),
                    title: None,
                    folder_path: None,
                    request_key: Some("interrupted".into()),
                },
            )
            .await
            .unwrap();
            panic!("parent must terminate the child before submission commits");
        }

        for terminate_process in [false, true] {
            let dir = tempfile::tempdir().unwrap();
            let db = anlg_db_core::Db::connect_local_plain(dir.path().join("app.db"))
                .await
                .unwrap();
            anlg_db_app::prepare_schema(&db).await.unwrap();
            let vault = dir.path().to_string_lossy().into_owned();
            sqlx::query("INSERT INTO local_recording_import_worker (id, vault_path, updated_at) VALUES ('desktop', ?, unixepoch())")
                .bind(&vault).execute(db.pool()).await.unwrap();
            let source = dir.path().join("source.wav");
            tokio::fs::write(&source, b"recording content")
                .await
                .unwrap();
            let input = ImportRecordingInput {
                file_path: source.to_string_lossy().into_owned(),
                title: None,
                folder_path: None,
                request_key: Some("kept".into()),
            };
            let kept = import_recording(db.pool(), input.clone()).await.unwrap();
            let kept_path: String = sqlx::query_scalar(
                "SELECT file_path FROM local_recording_import_jobs WHERE id = ?",
            )
            .bind(&kept.job_id)
            .fetch_one(db.pool())
            .await
            .unwrap();
            let staging = Path::new(&kept_path).parent().unwrap().to_path_buf();
            let unrelated = staging.join("notes.wav");
            tokio::fs::write(&unrelated, b"unrelated").await.unwrap();
            #[cfg(unix)]
            let symlink = {
                let link = staging.join(format!("{}.wav", uuid::Uuid::new_v4()));
                std::os::unix::fs::symlink(&source, &link).unwrap();
                link
            };
            let blocker = db.pool().begin_with("BEGIN IMMEDIATE").await.unwrap();
            let mut child = terminate_process.then(|| {
                std::process::Command::new(std::env::current_exe().unwrap())
                    .args(["--exact", "recording_import::tests::interrupted_submissions_are_cleaned_without_touching_other_audio", "--nocapture"])
                    .env(CHILD_VAULT, dir.path())
                    .stdout(std::process::Stdio::null())
                    .spawn().unwrap()
            });
            let task = if terminate_process {
                None
            } else {
                let pool = db.pool().clone();
                let mut input = input.clone();
                input.request_key = Some("interrupted".into());
                Some(tokio::spawn(
                    async move { import_recording(&pool, input).await },
                ))
            };
            let orphan = tokio::time::timeout(std::time::Duration::from_secs(10), async {
                loop {
                    if let Some(path) = std::fs::read_dir(&staging)
                        .unwrap()
                        .filter_map(|entry| entry.ok())
                        .filter(|entry| entry.file_type().unwrap().is_file())
                        .map(|entry| entry.path())
                        .find(|path| {
                            path.to_string_lossy() != kept_path
                                && path != &unrelated
                                && path.file_name().unwrap() != ".lock"
                        })
                    {
                        break path;
                    }
                    tokio::time::sleep(std::time::Duration::from_millis(10)).await;
                }
            })
            .await
            .unwrap();
            // Cleanup must skip the live submitter without waiting for its lock
            // or the write transaction deliberately held by this test.
            tokio::time::timeout(
                std::time::Duration::from_secs(1),
                cleanup_recording_imports(db.pool(), &vault),
            )
            .await
            .unwrap()
            .unwrap();
            assert!(orphan.exists());
            if let Some(child) = child.as_mut() {
                child.kill().unwrap();
                child.wait().unwrap();
            }
            if let Some(task) = task {
                task.abort();
                assert!(task.await.unwrap_err().is_cancelled());
            }
            blocker.rollback().await.unwrap();
            let other_db = anlg_db_core::Db::connect_local_plain(dir.path().join("other.db"))
                .await
                .unwrap();
            anlg_db_app::prepare_schema(&other_db).await.unwrap();
            cleanup_recording_imports(other_db.pool(), &vault)
                .await
                .unwrap();
            assert!(
                orphan.exists(),
                "another database must not sweep this database's staging files"
            );
            other_db.pool().close().await;
            cleanup_recording_imports(db.pool(), &vault).await.unwrap();
            assert!(!orphan.exists());
            assert_eq!(std::fs::read(&kept_path).unwrap(), b"recording content");
            assert_eq!(std::fs::read(&source).unwrap(), b"recording content");
            assert_eq!(std::fs::read(&unrelated).unwrap(), b"unrelated");
            #[cfg(unix)]
            assert!(
                std::fs::symlink_metadata(&symlink)
                    .unwrap()
                    .file_type()
                    .is_symlink()
            );
            let jobs: i64 = sqlx::query_scalar("SELECT count(*) FROM local_recording_import_jobs")
                .fetch_one(db.pool())
                .await
                .unwrap();
            assert_eq!(jobs, 1);
            assert_eq!(
                import_recording(db.pool(), input).await.unwrap().job_id,
                kept.job_id
            );
            db.pool().close().await;
        }
    }

    #[tokio::test]
    async fn unavailable_worker_and_invalid_files_leave_no_meetings() {
        let dir = tempfile::tempdir().unwrap();
        let db = anlg_db_core::Db::connect_local_plain(dir.path().join("app.db"))
            .await
            .unwrap();
        anlg_db_app::prepare_schema(&db).await.unwrap();
        let file = dir.path().join("empty.wav");
        tokio::fs::write(&file, b"").await.unwrap();
        let input = ImportRecordingInput {
            file_path: file.to_string_lossy().into_owned(),
            title: None,
            folder_path: None,
            request_key: None,
        };
        assert!(
            import_recording(db.pool(), input.clone())
                .await
                .unwrap_err()
                .to_string()
                .contains("desktop")
        );
        sqlx::query("INSERT INTO local_recording_import_worker (id, vault_path, updated_at) VALUES ('desktop', ?, unixepoch())")
            .bind(dir.path().to_string_lossy().as_ref())
            .execute(db.pool())
            .await
            .unwrap();
        assert!(
            import_recording(db.pool(), input)
                .await
                .unwrap_err()
                .to_string()
                .contains("nonempty")
        );
        tokio::fs::write(&file, b"audio").await.unwrap();
        sqlx::query("INSERT INTO managed_app_settings (id, value_json) VALUES ('intelligence_disabled', 'true')").execute(db.pool()).await.unwrap();
        assert!(
            import_recording(
                db.pool(),
                ImportRecordingInput {
                    file_path: file.to_string_lossy().into_owned(),
                    title: None,
                    folder_path: None,
                    request_key: None
                }
            )
            .await
            .unwrap_err()
            .to_string()
            .contains("managed intelligence")
        );
        let count: i64 = sqlx::query_scalar("SELECT count(*) FROM sessions")
            .fetch_one(db.pool())
            .await
            .unwrap();
        assert_eq!(count, 0);
        db.pool().close().await;
    }
}

/// Local-only execution metadata is not part of hosted meeting snapshots.
#[derive(Debug, Serialize, JsonSchema)]
pub struct LocalMeeting {
    #[serde(flatten)]
    pub meeting: crate::Meeting,
    pub processing_status: Option<String>,
    pub recording_import: Option<RecordingImport>,
}

pub async fn local_meeting(pool: &SqlitePool, meeting: crate::Meeting) -> Result<LocalMeeting> {
    let available: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'local_recording_import_jobs')")
        .fetch_one(pool).await.map_err(database)?;
    let job = if available {
        sqlx::query_as::<_, RecordingImport>("SELECT id AS job_id, meeting_id, processing_status, summary_status, error FROM local_recording_import_jobs WHERE meeting_id = ? ORDER BY updated_at DESC LIMIT 1")
            .bind(&meeting.id).fetch_optional(pool).await.map_err(database)?
    } else {
        None
    };
    Ok(LocalMeeting {
        processing_status: job.as_ref().map(|job| job.processing_status.clone()),
        meeting,
        recording_import: job,
    })
}
