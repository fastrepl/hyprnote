use std::collections::HashMap;
use std::future::Future;
use std::path::{Path, PathBuf};
use std::pin::Pin;

use hypr_db_parser::{
    EnhancedNote, Human, MigrationData, Organization, Session, SessionParticipant, Transcript,
};
use hypr_frontmatter::Document;
use hypr_version::Version;

use super::version_from_name;
use crate::Result;

pub fn version() -> &'static Version {
    version_from_name!()
}

pub fn run(base_dir: &Path) -> Pin<Box<dyn Future<Output = Result<()>> + Send + '_>> {
    Box::pin(run_inner(base_dir))
}

struct FileWrite {
    path: PathBuf,
    content: String,
}

fn write_all(writes: Vec<FileWrite>) -> Result<()> {
    for write in writes {
        if write.path.exists() {
            continue;
        }
        if let Some(parent) = write.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(&write.path, &write.content)?;
    }
    Ok(())
}

async fn run_inner(base_dir: &Path) -> Result<()> {
    let sqlite_path = base_dir.join("db.sqlite");
    if !sqlite_path.exists() {
        return Ok(());
    }

    let data = hypr_db_parser::v1::parse_from_sqlite(&sqlite_path).await?;
    let writes = collect_writes(base_dir, &data)?;
    write_all(writes)?;

    Ok(())
}

fn collect_writes(base_dir: &Path, data: &MigrationData) -> Result<Vec<FileWrite>> {
    let mut writes = vec![];

    writes.extend(collect_session_writes(base_dir, data)?);
    writes.extend(collect_human_writes(base_dir, data)?);
    writes.extend(collect_organization_writes(base_dir, data)?);

    Ok(writes)
}

fn collect_session_writes(base_dir: &Path, data: &MigrationData) -> Result<Vec<FileWrite>> {
    let sessions_dir = base_dir.join("sessions");

    let transcripts_by_session: HashMap<&str, &Transcript> = data
        .transcripts
        .iter()
        .map(|t| (t.session_id.as_str(), t))
        .collect();

    let participants_by_session: HashMap<&str, Vec<&SessionParticipant>> = {
        let mut map: HashMap<&str, Vec<_>> = HashMap::new();
        for p in &data.participants {
            map.entry(p.session_id.as_str()).or_default().push(p);
        }
        map
    };

    let tags_by_session: HashMap<&str, Vec<&str>> = {
        let mut map: HashMap<&str, Vec<&str>> = HashMap::new();
        let tag_names: HashMap<&str, &str> = data
            .tags
            .iter()
            .map(|t| (t.id.as_str(), t.name.as_str()))
            .collect();
        for mapping in &data.tag_mappings {
            if let Some(name) = tag_names.get(mapping.tag_id.as_str()) {
                map.entry(mapping.session_id.as_str())
                    .or_default()
                    .push(name);
            }
        }
        map
    };

    let enhanced_by_session: HashMap<&str, Vec<&EnhancedNote>> = {
        let mut map: HashMap<&str, Vec<_>> = HashMap::new();
        for note in &data.enhanced_notes {
            map.entry(note.session_id.as_str()).or_default().push(note);
        }
        map
    };

    let mut writes = vec![];

    for session in &data.sessions {
        let dir = sessions_dir.join(&session.id);

        let participants = participants_by_session
            .get(session.id.as_str())
            .map(|v| v.as_slice())
            .unwrap_or(&[]);
        let tags = tags_by_session
            .get(session.id.as_str())
            .map(|v| v.as_slice())
            .unwrap_or(&[]);
        let transcript = transcripts_by_session.get(session.id.as_str()).copied();
        let enhanced_notes = enhanced_by_session
            .get(session.id.as_str())
            .map(|v| v.as_slice())
            .unwrap_or(&[]);

        // sessions/{id}/_meta.json
        writes.push(FileWrite {
            path: dir.join("_meta.json"),
            content: build_session_meta(session, participants, tags),
        });

        // sessions/{id}/transcript.json
        if let Some(t) = transcript {
            writes.push(FileWrite {
                path: dir.join("transcript.json"),
                content: build_transcript_json(t),
            });
        }

        // sessions/{id}/note.md
        if let Some(raw_md) = &session.raw_md {
            if !raw_md.is_empty() {
                writes.push(FileWrite {
                    path: dir.join("note.md"),
                    content: raw_md.clone(),
                });
            }
        }

        // sessions/{id}/{note_id}.md
        for note in enhanced_notes {
            if let Some(content) = build_enhanced_note_doc(note) {
                writes.push(FileWrite {
                    path: dir.join(format!("{}.md", note.id)),
                    content,
                });
            }
        }
    }

    Ok(writes)
}

fn collect_human_writes(base_dir: &Path, data: &MigrationData) -> Result<Vec<FileWrite>> {
    let humans_dir = base_dir.join("humans");

    let writes = data
        .humans
        .iter()
        .map(|human| {
            // humans/{id}.md
            FileWrite {
                path: humans_dir.join(format!("{}.md", human.id)),
                content: build_human_doc(human),
            }
        })
        .collect();

    Ok(writes)
}

fn collect_organization_writes(base_dir: &Path, data: &MigrationData) -> Result<Vec<FileWrite>> {
    let orgs_dir = base_dir.join("organizations");

    let writes = data
        .organizations
        .iter()
        .map(|org| {
            // organizations/{id}.md
            FileWrite {
                path: orgs_dir.join(format!("{}.md", org.id)),
                content: build_organization_doc(org),
            }
        })
        .collect();

    Ok(writes)
}

fn build_session_meta(
    session: &Session,
    participants: &[&SessionParticipant],
    tags: &[&str],
) -> String {
    let participants_json: Vec<serde_json::Value> = participants
        .iter()
        .map(|p| {
            serde_json::json!({
                "id": p.id,
                "user_id": p.user_id,
                "session_id": p.session_id,
                "human_id": p.human_id,
                "source": p.source,
            })
        })
        .collect();

    let tags_json: Option<Vec<&str>> = if tags.is_empty() {
        None
    } else {
        Some(tags.to_vec())
    };

    let meta = serde_json::json!({
        "id": session.id,
        "user_id": session.user_id,
        "created_at": session.created_at,
        "title": session.title,
        "event_id": session.event_id,
        "participants": participants_json,
        "tags": tags_json,
    });

    serde_json::to_string_pretty(&meta).unwrap()
}

fn build_transcript_json(transcript: &Transcript) -> String {
    let words: Vec<serde_json::Value> = transcript
        .words
        .iter()
        .map(|w| {
            serde_json::json!({
                "id": w.id,
                "text": w.text,
                "start_ms": w.start_ms,
                "end_ms": w.end_ms,
                "channel": w.channel,
                "speaker": w.speaker,
            })
        })
        .collect();

    let data = serde_json::json!({
        "transcripts": [{
            "id": transcript.id,
            "user_id": transcript.user_id,
            "created_at": transcript.created_at,
            "session_id": transcript.session_id,
            "started_at": transcript.started_at,
            "ended_at": transcript.ended_at,
            "words": words,
            "speaker_hints": [],
        }]
    });

    serde_json::to_string_pretty(&data).unwrap()
}

fn build_enhanced_note_doc(note: &EnhancedNote) -> Option<String> {
    if note.content.is_empty() {
        return None;
    }

    let frontmatter = serde_json::json!({
        "id": note.id,
        "session_id": note.session_id,
        "template_id": note.template_id,
        "position": note.position,
        "title": note.title,
    });

    let doc = Document::new(frontmatter, &note.content);
    doc.render().ok()
}

fn build_human_doc(human: &Human) -> String {
    let emails: Vec<&str> = human
        .email
        .as_ref()
        .map(|e| e.split(',').map(|s| s.trim()).collect())
        .unwrap_or_default();

    let frontmatter = serde_json::json!({
        "user_id": human.user_id,
        "name": human.name,
        "emails": emails,
        "org_id": human.org_id.as_deref().unwrap_or(""),
        "job_title": human.job_title.as_deref().unwrap_or(""),
        "linkedin_username": human.linkedin_username.as_deref().unwrap_or(""),
        "pinned": false,
    });

    let doc = Document::new(frontmatter, "");
    doc.render().unwrap()
}

fn build_organization_doc(org: &Organization) -> String {
    let frontmatter = serde_json::json!({
        "user_id": org.user_id,
        "name": org.name,
        "description": org.description.as_deref().unwrap_or(""),
    });

    let doc = Document::new(frontmatter, "");
    doc.render().unwrap()
}
