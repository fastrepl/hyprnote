use std::collections::HashMap;
use std::future::Future;
use std::path::Path;
use std::pin::Pin;

use hypr_db_parser::{Collection, Transcript};
use hypr_version::Version;

use super::utils::{FileOp, apply_ops};
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
        if sqlite_transcripts.len() <= 1 {
            continue;
        }

        if !transcript_path.exists() {
            continue;
        }

        let file_count = count_transcripts_in_file(&transcript_path);
        if file_count >= sqlite_transcripts.len() {
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

fn count_transcripts_in_file(path: &Path) -> usize {
    let Ok(content) = std::fs::read_to_string(path) else {
        return 0;
    };

    let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) else {
        return 0;
    };

    json.get("transcripts")
        .and_then(|t| t.as_array())
        .map(|arr| arr.len())
        .unwrap_or(0)
}

fn build_transcript_json_multi(transcripts: &[&Transcript]) -> String {
    let mut sorted: Vec<&Transcript> = transcripts.to_vec();
    sorted.sort_by(|a, b| {
        a.started_at
            .partial_cmp(&b.started_at)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let transcripts_json: Vec<serde_json::Value> = sorted
        .iter()
        .map(|transcript| {
            let words: Vec<serde_json::Value> = transcript
                .words
                .iter()
                .map(|w| {
                    serde_json::json!({
                        "id": w.id,
                        "text": w.text,
                        "start_ms": w.start_ms.unwrap_or(0.0) as i64,
                        "end_ms": w.end_ms.unwrap_or(0.0) as i64,
                        "channel": w.channel,
                        "speaker": w.speaker,
                    })
                })
                .collect();

            serde_json::json!({
                "id": transcript.id,
                "user_id": transcript.user_id,
                "created_at": transcript.created_at,
                "session_id": transcript.session_id,
                "started_at": transcript.started_at as i64,
                "ended_at": transcript.ended_at.map(|v| v as i64),
                "words": words,
                "speaker_hints": [],
            })
        })
        .collect();

    let data = serde_json::json!({
        "transcripts": transcripts_json
    });

    serde_json::to_string_pretty(&data).unwrap()
}
