use std::collections::HashMap;
use std::path::Path;

use hypr_db_parser::{MigrationData, Transcript};
use hypr_version::Version;

use super::version_from_name;
use crate::Result;

pub fn version() -> &'static Version {
    version_from_name!()
}

pub fn run(base_dir: &Path) -> Result<()> {
    let sqlite_path = base_dir.join("db.sqlite");
    if !sqlite_path.exists() {
        return Ok(());
    }

    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    let data = rt.block_on(hypr_db_parser::v1::parse_from_sqlite(&sqlite_path))?;

    write_sessions(base_dir, &data)?;
    write_humans(base_dir, &data)?;
    write_organizations(base_dir, &data)?;

    Ok(())
}

fn write_sessions(base_dir: &Path, data: &MigrationData) -> Result<()> {
    let sessions_dir = base_dir.join("sessions");

    let transcripts_by_session: HashMap<&str, &Transcript> = data
        .transcripts
        .iter()
        .map(|t| (t.session_id.as_str(), t))
        .collect();

    let participants_by_session: HashMap<&str, Vec<&hypr_db_parser::SessionParticipant>> = {
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

    let enhanced_by_session: HashMap<&str, Vec<&hypr_db_parser::EnhancedNote>> = {
        let mut map: HashMap<&str, Vec<_>> = HashMap::new();
        for note in &data.enhanced_notes {
            map.entry(note.session_id.as_str()).or_default().push(note);
        }
        map
    };

    for session in &data.sessions {
        let session_dir = sessions_dir.join(&session.id);

        if session_dir.exists() {
            continue;
        }

        std::fs::create_dir_all(&session_dir)?;

        let participants: Vec<serde_json::Value> = participants_by_session
            .get(session.id.as_str())
            .map(|ps| {
                ps.iter()
                    .map(|p| {
                        serde_json::json!({
                            "id": p.id,
                            "user_id": p.user_id,
                            "session_id": p.session_id,
                            "human_id": p.human_id,
                            "source": p.source,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let tags: Option<Vec<&str>> = tags_by_session
            .get(session.id.as_str())
            .map(|t| t.iter().copied().collect());

        let meta = serde_json::json!({
            "id": session.id,
            "user_id": session.user_id,
            "created_at": session.created_at,
            "title": session.title,
            "event_id": session.event_id,
            "participants": participants,
            "tags": tags,
        });
        std::fs::write(
            session_dir.join("_meta.json"),
            serde_json::to_string_pretty(&meta)?,
        )?;

        if let Some(transcript) = transcripts_by_session.get(session.id.as_str()) {
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

            let transcript_data = serde_json::json!({
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
            std::fs::write(
                session_dir.join("transcript.json"),
                serde_json::to_string_pretty(&transcript_data)?,
            )?;
        }

        if let Some(raw_md) = &session.raw_md {
            if !raw_md.is_empty() {
                std::fs::write(session_dir.join("note.md"), raw_md)?;
            }
        }

        if let Some(enhanced_notes) = enhanced_by_session.get(session.id.as_str()) {
            for note in enhanced_notes {
                if note.content.is_empty() {
                    continue;
                }
                let frontmatter = serde_json::json!({
                    "id": note.id,
                    "session_id": note.session_id,
                    "template_id": note.template_id,
                    "position": note.position,
                    "title": note.title,
                });
                let content = format!(
                    "---\n{}\n---\n\n{}",
                    serde_json::to_string_pretty(&frontmatter)?,
                    note.content
                );
                let filename = format!("{}.md", note.id);
                std::fs::write(session_dir.join(filename), content)?;
            }
        }
    }

    Ok(())
}

fn write_humans(base_dir: &Path, data: &MigrationData) -> Result<()> {
    if data.humans.is_empty() {
        return Ok(());
    }

    let humans_dir = base_dir.join("humans");
    std::fs::create_dir_all(&humans_dir)?;

    for human in &data.humans {
        let path = humans_dir.join(format!("{}.md", human.id));

        if path.exists() {
            continue;
        }

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

        let content = format!("---\n{}\n---\n", serde_json::to_string_pretty(&frontmatter)?);
        std::fs::write(path, content)?;
    }

    Ok(())
}

fn write_organizations(base_dir: &Path, data: &MigrationData) -> Result<()> {
    if data.organizations.is_empty() {
        return Ok(());
    }

    let orgs_dir = base_dir.join("organizations");
    std::fs::create_dir_all(&orgs_dir)?;

    for org in &data.organizations {
        let path = orgs_dir.join(format!("{}.md", org.id));

        if path.exists() {
            continue;
        }

        let frontmatter = serde_json::json!({
            "user_id": org.user_id,
            "name": org.name,
            "description": org.description.as_deref().unwrap_or(""),
        });

        let content = format!("---\n{}\n---\n", serde_json::to_string_pretty(&frontmatter)?);
        std::fs::write(path, content)?;
    }

    Ok(())
}
