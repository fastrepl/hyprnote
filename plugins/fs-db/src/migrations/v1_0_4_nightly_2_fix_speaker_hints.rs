use std::collections::HashMap;
use std::future::Future;
use std::path::Path;
use std::pin::Pin;

use hypr_db_parser::Collection;
use hypr_version::Version;
use serde_json::Value;

use super::version_from_name;
use crate::Result;

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

    if hypr_db_parser::v1::validate(&sqlite_path).await.is_err() {
        return Ok(());
    }

    let data = hypr_db_parser::v1::parse_from_sqlite(&sqlite_path).await?;
    let hints_by_session = collect_hints_by_session(&data);

    if hints_by_session.is_empty() {
        return Ok(());
    }

    update_transcript_files(base_dir, &hints_by_session)?;

    Ok(())
}

fn collect_hints_by_session(
    data: &Collection,
) -> HashMap<String, Vec<&hypr_db_parser::SpeakerHint>> {
    let mut map: HashMap<String, Vec<&hypr_db_parser::SpeakerHint>> = HashMap::new();

    for transcript in &data.transcripts {
        if transcript.speaker_hints.is_empty() {
            continue;
        }
        map.entry(transcript.session_id.clone())
            .or_default()
            .extend(transcript.speaker_hints.iter());
    }

    map
}

fn update_transcript_files(
    base_dir: &Path,
    hints_by_session: &HashMap<String, Vec<&hypr_db_parser::SpeakerHint>>,
) -> Result<()> {
    let sessions_dir = base_dir.join("sessions");
    if !sessions_dir.exists() {
        return Ok(());
    }

    for (session_id, hints) in hints_by_session {
        if hints.is_empty() {
            continue;
        }

        let transcript_path = sessions_dir.join(session_id).join("transcript.json");
        if !transcript_path.exists() {
            continue;
        }

        let content = match std::fs::read_to_string(&transcript_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let mut data: Value = match serde_json::from_str(&content) {
            Ok(d) => d,
            Err(_) => continue,
        };

        let Some(transcripts) = data.get_mut("transcripts").and_then(|v| v.as_array_mut()) else {
            continue;
        };

        for transcript in transcripts.iter_mut() {
            let hints_json: Vec<Value> = hints
                .iter()
                .map(|h| {
                    let value: Value =
                        serde_json::from_str(&h.value).unwrap_or(Value::String(h.value.clone()));
                    serde_json::json!({
                        "id": uuid::Uuid::new_v4().to_string(),
                        "word_id": h.word_id,
                        "type": h.hint_type,
                        "value": value,
                    })
                })
                .collect();

            transcript["speaker_hints"] = Value::Array(hints_json);
        }

        let updated = serde_json::to_string_pretty(&data)?;
        std::fs::write(&transcript_path, updated)?;
    }

    Ok(())
}
