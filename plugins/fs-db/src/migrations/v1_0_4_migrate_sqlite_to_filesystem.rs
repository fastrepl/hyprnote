use std::path::Path;

use semver::Version;
use serde::{Deserialize, Serialize};
use tauri_plugin_importer::sources::hyprnote::v1_sqlite::import_all_from_path;
use tauri_plugin_importer::{
    ImportResult, ImportedEnhancedNote, ImportedNote, ImportedSessionParticipant,
    ImportedTranscript,
};

use crate::Result;

pub const FROM_VERSION: Version = Version::new(1, 0, 3);
pub const TO_VERSION: Version = Version::new(1, 0, 4);

pub fn run(base_dir: &Path) -> Result<()> {
    let sqlite_file = base_dir.join("db.sqlite");
    if !sqlite_file.exists() {
        return Ok(());
    }

    let sessions_dir = base_dir.join("sessions");
    if sessions_dir.exists() && has_session_data(&sessions_dir) {
        return Ok(());
    }

    let runtime = tokio::runtime::Runtime::new().map_err(|e| crate::Error::Io(e.into()))?;

    runtime.block_on(async { migrate_sqlite_to_filesystem(base_dir, &sqlite_file).await })
}

fn has_session_data(sessions_dir: &Path) -> bool {
    if let Ok(entries) = std::fs::read_dir(sessions_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let meta_file = path.join("_meta.json");
                if meta_file.exists() {
                    return true;
                }
            }
        }
    }
    false
}

async fn migrate_sqlite_to_filesystem(base_dir: &Path, sqlite_file: &Path) -> Result<()> {
    let import_result = import_all_from_path(sqlite_file)
        .await
        .map_err(|e| crate::Error::ImportFailed(e.to_string()))?;

    write_sessions(base_dir, &import_result)?;
    write_templates(base_dir, &import_result)?;
    write_humans(base_dir, &import_result)?;
    write_organizations(base_dir, &import_result)?;

    Ok(())
}

#[derive(Serialize, Deserialize)]
struct SessionMetaJson {
    id: String,
    user_id: String,
    created_at: String,
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    event_id: Option<String>,
    participants: Vec<ParticipantData>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tags: Option<Vec<String>>,
}

#[derive(Clone, Serialize, Deserialize)]
struct ParticipantData {
    id: String,
    user_id: String,
    session_id: String,
    human_id: String,
    source: String,
}

#[derive(Serialize, Deserialize)]
struct TranscriptJson {
    transcripts: Vec<TranscriptWithData>,
}

#[derive(Serialize, Deserialize)]
struct TranscriptWithData {
    id: String,
    user_id: String,
    created_at: String,
    session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    started_at: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    ended_at: Option<f64>,
    words: Vec<WordData>,
    speaker_hints: Vec<SpeakerHintData>,
}

#[derive(Serialize, Deserialize)]
struct WordData {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    transcript_id: Option<String>,
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    start_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    end_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    channel: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    speaker: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct SpeakerHintData {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    transcript_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    word_id: Option<String>,
    #[serde(rename = "type")]
    #[serde(skip_serializing_if = "Option::is_none")]
    hint_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    value: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct NoteFrontmatter {
    id: String,
    session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    template_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    position: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    title: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct HumanFrontmatter {
    user_id: String,
    created_at: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    emails: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    org_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    job_title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    linkedin_username: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct OrgFrontmatter {
    user_id: String,
    created_at: String,
    name: String,
}

#[derive(Serialize, Deserialize)]
struct TemplateJson {
    user_id: String,
    created_at: String,
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sections: Option<serde_json::Value>,
}

const DEFAULT_USER_ID: &str = "00000000-0000-0000-0000-000000000000";

fn write_sessions(base_dir: &Path, data: &ImportResult) -> Result<()> {
    let sessions_dir = base_dir.join("sessions");
    std::fs::create_dir_all(&sessions_dir)?;

    let participants_by_session = build_participants_map(&data.participants);
    let transcripts_by_session = build_transcripts_map(&data.transcripts);
    let enhanced_notes_by_session = build_enhanced_notes_map(&data.enhanced_notes);

    for note in &data.notes {
        let session_dir = sessions_dir.join(&note.id);

        if session_dir.exists() {
            continue;
        }

        std::fs::create_dir_all(&session_dir)?;

        let participants = participants_by_session
            .get(&note.id)
            .cloned()
            .unwrap_or_default();

        let meta = SessionMetaJson {
            id: note.id.clone(),
            user_id: DEFAULT_USER_ID.to_string(),
            created_at: note.created_at.clone(),
            title: note.title.clone(),
            event_id: note.event_id.clone(),
            participants,
            tags: if note.tags.is_empty() {
                None
            } else {
                Some(note.tags.clone())
            },
        };

        let meta_path = session_dir.join("_meta.json");
        let meta_json = serde_json::to_string_pretty(&meta)?;
        std::fs::write(&meta_path, meta_json)?;

        if let Some(transcripts) = transcripts_by_session.get(&note.id) {
            write_transcript(&session_dir, transcripts)?;
        }

        if let Some(raw_md) = &note.raw_md {
            if !raw_md.is_empty() {
                write_memo(&session_dir, note)?;
            }
        }

        if let Some(enhanced_notes) = enhanced_notes_by_session.get(&note.id) {
            for enhanced_note in enhanced_notes {
                write_enhanced_note(&session_dir, enhanced_note, data)?;
            }
        }
    }

    Ok(())
}

fn build_participants_map(
    participants: &[ImportedSessionParticipant],
) -> std::collections::HashMap<String, Vec<ParticipantData>> {
    let mut map: std::collections::HashMap<String, Vec<ParticipantData>> =
        std::collections::HashMap::new();

    for p in participants {
        let data = ParticipantData {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: DEFAULT_USER_ID.to_string(),
            session_id: p.session_id.clone(),
            human_id: p.human_id.clone(),
            source: p.source.clone(),
        };
        map.entry(p.session_id.clone()).or_default().push(data);
    }

    map
}

fn build_transcripts_map(
    transcripts: &[ImportedTranscript],
) -> std::collections::HashMap<String, Vec<&ImportedTranscript>> {
    let mut map: std::collections::HashMap<String, Vec<&ImportedTranscript>> =
        std::collections::HashMap::new();

    for t in transcripts {
        map.entry(t.session_id.clone()).or_default().push(t);
    }

    map
}

fn build_enhanced_notes_map(
    notes: &[ImportedEnhancedNote],
) -> std::collections::HashMap<String, Vec<&ImportedEnhancedNote>> {
    let mut map: std::collections::HashMap<String, Vec<&ImportedEnhancedNote>> =
        std::collections::HashMap::new();

    for n in notes {
        map.entry(n.session_id.clone()).or_default().push(n);
    }

    map
}

fn write_transcript(session_dir: &Path, transcripts: &[&ImportedTranscript]) -> Result<()> {
    let transcript_data: Vec<TranscriptWithData> = transcripts
        .iter()
        .map(|t| {
            let words: Vec<WordData> = t
                .words
                .iter()
                .map(|w| WordData {
                    id: w.id.clone(),
                    user_id: Some(DEFAULT_USER_ID.to_string()),
                    created_at: None,
                    transcript_id: Some(t.id.clone()),
                    text: w.text.clone(),
                    start_ms: w.start_ms,
                    end_ms: w.end_ms,
                    channel: None,
                    speaker: Some(w.speaker.clone()),
                })
                .collect();

            TranscriptWithData {
                id: t.id.clone(),
                user_id: DEFAULT_USER_ID.to_string(),
                created_at: t.created_at.clone(),
                session_id: t.session_id.clone(),
                started_at: t.start_ms,
                ended_at: t.end_ms,
                words,
                speaker_hints: vec![],
            }
        })
        .collect();

    let transcript_json = TranscriptJson {
        transcripts: transcript_data,
    };

    let path = session_dir.join("transcript.json");
    let json = serde_json::to_string_pretty(&transcript_json)?;
    std::fs::write(&path, json)?;

    Ok(())
}

fn write_memo(session_dir: &Path, note: &ImportedNote) -> Result<()> {
    let frontmatter = NoteFrontmatter {
        id: note.id.clone(),
        session_id: note.id.clone(),
        template_id: None,
        position: None,
        title: None,
    };

    let yaml = serde_yaml_frontmatter(&frontmatter)?;
    let content = note.raw_md.as_deref().unwrap_or("");
    let markdown = format!("---\n{}---\n\n{}", yaml, content);

    let path = session_dir.join("_memo.md");
    std::fs::write(&path, markdown)?;

    Ok(())
}

fn write_enhanced_note(
    session_dir: &Path,
    note: &ImportedEnhancedNote,
    data: &ImportResult,
) -> Result<()> {
    let frontmatter = NoteFrontmatter {
        id: note.id.clone(),
        session_id: note.session_id.clone(),
        template_id: note.template_id.clone(),
        position: Some(note.position),
        title: if note.title.is_empty() {
            None
        } else {
            Some(note.title.clone())
        },
    };

    let yaml = serde_yaml_frontmatter(&frontmatter)?;
    let markdown = format!("---\n{}---\n\n{}", yaml, note.content);

    let filename = if let Some(template_id) = &note.template_id {
        let template_title = data
            .templates
            .iter()
            .find(|t| t.id == *template_id)
            .map(|t| t.title.as_str())
            .unwrap_or(template_id);
        format!("{}.md", sanitize_filename(template_title))
    } else {
        "_summary.md".to_string()
    };

    let path = session_dir.join(filename);
    std::fs::write(&path, markdown)?;

    Ok(())
}

fn write_templates(base_dir: &Path, data: &ImportResult) -> Result<()> {
    if data.templates.is_empty() {
        return Ok(());
    }

    let mut templates_map: std::collections::HashMap<String, TemplateJson> =
        std::collections::HashMap::new();

    for template in &data.templates {
        let sections = if template.sections.is_empty() {
            None
        } else {
            Some(serde_json::to_value(&template.sections)?)
        };

        templates_map.insert(
            template.id.clone(),
            TemplateJson {
                user_id: DEFAULT_USER_ID.to_string(),
                created_at: String::new(),
                title: template.title.clone(),
                description: if template.description.is_empty() {
                    None
                } else {
                    Some(template.description.clone())
                },
                sections,
            },
        );
    }

    let path = base_dir.join("templates.json");
    let json = serde_json::to_string_pretty(&templates_map)?;
    std::fs::write(&path, json)?;

    Ok(())
}

fn write_humans(base_dir: &Path, data: &ImportResult) -> Result<()> {
    if data.humans.is_empty() {
        return Ok(());
    }

    let humans_dir = base_dir.join("humans");
    std::fs::create_dir_all(&humans_dir)?;

    for human in &data.humans {
        let frontmatter = HumanFrontmatter {
            user_id: DEFAULT_USER_ID.to_string(),
            created_at: human.created_at.clone(),
            name: human.name.clone(),
            emails: human.email.as_ref().map(|e| vec![e.clone()]),
            org_id: human.org_id.clone(),
            job_title: human.job_title.clone(),
            linkedin_username: human.linkedin_username.clone(),
        };

        let yaml = serde_yaml_frontmatter(&frontmatter)?;
        let markdown = format!("---\n{}---\n\n", yaml);

        let path = humans_dir.join(format!("{}.md", human.id));
        std::fs::write(&path, markdown)?;
    }

    Ok(())
}

fn write_organizations(base_dir: &Path, data: &ImportResult) -> Result<()> {
    if data.organizations.is_empty() {
        return Ok(());
    }

    let orgs_dir = base_dir.join("organizations");
    std::fs::create_dir_all(&orgs_dir)?;

    for org in &data.organizations {
        let frontmatter = OrgFrontmatter {
            user_id: DEFAULT_USER_ID.to_string(),
            created_at: org.created_at.clone(),
            name: org.name.clone(),
        };

        let yaml = serde_yaml_frontmatter(&frontmatter)?;
        let markdown = format!("---\n{}---\n\n", yaml);

        let path = orgs_dir.join(format!("{}.md", org.id));
        std::fs::write(&path, markdown)?;
    }

    Ok(())
}

fn serde_yaml_frontmatter<T: Serialize>(value: &T) -> Result<String> {
    let json = serde_json::to_value(value)?;
    let yaml = json_to_yaml(&json);
    Ok(yaml)
}

fn json_to_yaml(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Object(map) => {
            let mut lines = Vec::new();
            for (key, val) in map {
                match val {
                    serde_json::Value::Null => {}
                    serde_json::Value::Array(arr) => {
                        if arr.is_empty() {
                            continue;
                        }
                        lines.push(format!("{}:", key));
                        for item in arr {
                            if let serde_json::Value::String(s) = item {
                                lines.push(format!("  - \"{}\"", escape_yaml_string(s)));
                            }
                        }
                    }
                    serde_json::Value::String(s) => {
                        lines.push(format!("{}: \"{}\"", key, escape_yaml_string(s)));
                    }
                    serde_json::Value::Number(n) => {
                        lines.push(format!("{}: {}", key, n));
                    }
                    serde_json::Value::Bool(b) => {
                        lines.push(format!("{}: {}", key, b));
                    }
                    _ => {}
                }
            }
            lines.join("\n") + "\n"
        }
        _ => String::new(),
    }
}

fn escape_yaml_string(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if "<>:\"/\\|?*".contains(c) {
                '_'
            } else {
                c
            }
        })
        .collect::<String>()
        .trim()
        .to_string()
}
