use std::collections::HashMap;
use std::future::Future;
use std::path::Path;
use std::pin::Pin;

use hypr_db_parser::{Collection, Transcript};
use hypr_version::Version;
use serde_json::Value;

use super::utils::{FileOp, apply_ops, build_transcript_json_multi};
use super::version_from_name;
use crate::Result;

mod files {
    pub const TRANSCRIPT: &str = "transcript.json";
}

fn group_by_session_id<'a, T, F>(items: &'a [T], get_id: F) -> HashMap<&'a str, Vec<&'a T>>
where
    F: Fn(&T) -> &str,
{
    let mut map: HashMap<&str, Vec<&T>> = HashMap::new();
    for item in items {
        map.entry(get_id(item)).or_default().push(item);
    }
    map
}

pub struct Migrate;

impl super::Migration for Migrate {
    fn introduced_in(&self) -> &'static Version {
        version_from_name!()
    }

    fn run<'a>(&self, base_dir: &'a Path) -> Pin<Box<dyn Future<Output = Result<()>> + Send + 'a>> {
        Box::pin(run_inner(base_dir))
    }
}

async fn run_inner(base_dir: &Path) -> Result<()> {
    let sqlite_path = base_dir.join("db.sqlite");
    if !sqlite_path.exists() {
        return Ok(());
    }

    let data = match try_parse_sqlite(&sqlite_path).await {
        Some(data) => data,
        None => return Ok(()),
    };

    let ops = collect_repair_ops(base_dir, &data)?;
    apply_ops(ops)?;

    Ok(())
}

async fn try_parse_sqlite(path: &Path) -> Option<Collection> {
    if hypr_db_parser::v1::validate(path).await.is_ok() {
        return hypr_db_parser::v1::parse_from_sqlite(path).await.ok();
    }

    if hypr_db_parser::v0::validate(path).await.is_ok() {
        return hypr_db_parser::v0::parse_from_sqlite(path).await.ok();
    }

    None
}

fn collect_repair_ops(base_dir: &Path, data: &Collection) -> Result<Vec<FileOp>> {
    let sessions_dir = base_dir.join("sessions");
    let transcripts_by_session = group_by_session_id(&data.transcripts, |t| &t.session_id);

    let mut ops = vec![];

    for session in &data.sessions {
        let sid = session.id.as_str();
        let transcript_path = sessions_dir.join(sid).join(files::TRANSCRIPT);

        let sqlite_transcripts = transcripts_by_session
            .get(sid)
            .map(|v| v.as_slice())
            .unwrap_or(&[]);

        if sqlite_transcripts.is_empty() {
            continue;
        }

        if !transcript_path.exists() {
            continue;
        }

        // Check if repair is needed:
        // 1. File has fewer transcripts than SQLite
        // 2. SQLite has speaker_hints but file doesn't
        if !needs_repair(&transcript_path, sqlite_transcripts) {
            continue;
        }

        ops.push(FileOp::Write {
            path: transcript_path,
            content: build_transcript_json_multi(sqlite_transcripts),
            force: true,
        });
    }

    Ok(ops)
}

fn needs_repair(path: &Path, sqlite_transcripts: &[&Transcript]) -> bool {
    let Ok(content) = std::fs::read_to_string(path) else {
        return false;
    };

    let Ok(json) = serde_json::from_str::<Value>(&content) else {
        return false;
    };

    let Some(file_transcripts) = json.get("transcripts").and_then(|t| t.as_array()) else {
        return false;
    };

    // Repair if file has fewer transcripts than SQLite
    if file_transcripts.len() < sqlite_transcripts.len() {
        return true;
    }

    // Repair if SQLite has speaker_hints but file has empty speaker_hints
    let sqlite_has_hints = sqlite_transcripts
        .iter()
        .any(|t| !t.speaker_hints.is_empty());

    if sqlite_has_hints {
        let file_has_hints = file_transcripts.iter().any(|t| {
            t.get("speaker_hints")
                .and_then(|h| h.as_array())
                .map(|arr| !arr.is_empty())
                .unwrap_or(false)
        });

        if !file_has_hints {
            return true;
        }
    }

    false
}
