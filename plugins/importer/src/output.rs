use crate::types::{
    ImportResult, ImportedHuman, ImportedNote, ImportedOrganization, ImportedSessionParticipant,
    ImportedTranscript,
};
use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::HashMap;

#[derive(Serialize)]
struct Organization {
    user_id: String,
    created_at: String,
    name: String,
}

#[derive(Serialize)]
struct Human {
    user_id: String,
    created_at: String,
    name: String,
    email: String,
    org_id: String,
    job_title: String,
    linkedin_username: String,
    memo: String,
}

#[derive(Serialize)]
struct Session {
    user_id: String,
    created_at: String,
    folder_id: String,
    event_id: String,
    title: String,
    raw_md: String,
}

#[derive(Serialize)]
struct EnhancedNote {
    user_id: String,
    created_at: String,
    session_id: String,
    content: String,
    position: i32,
    title: String,
}

#[derive(Serialize)]
struct Transcript {
    user_id: String,
    created_at: String,
    session_id: String,
    started_at: i64,
    ended_at: i64,
    words: String,
    speaker_hints: String,
}

#[derive(Serialize)]
struct WordInTranscript {
    id: String,
    user_id: String,
    transcript_id: String,
    text: String,
    start_ms: i64,
    end_ms: i64,
    channel: i32,
    created_at: String,
}

#[derive(Serialize)]
struct SessionParticipant {
    user_id: String,
    created_at: String,
    session_id: String,
    human_id: String,
    source: String,
}

#[derive(Serialize)]
struct Tag {
    user_id: String,
    created_at: String,
    name: String,
}

#[derive(Serialize)]
struct TagSessionMapping {
    user_id: String,
    created_at: String,
    tag_id: String,
    session_id: String,
}

pub(crate) fn to_tinybase_json(data: &ImportResult, user_id: &str) -> Value {
    let mut tables: Map<String, Value> = Map::new();

    insert_organizations(&mut tables, &data.organizations, user_id);
    insert_humans(&mut tables, &data.humans, user_id);
    insert_sessions(&mut tables, &data.notes, user_id);
    insert_transcripts_and_words(&mut tables, &data.transcripts, user_id);
    insert_participants(&mut tables, &data.participants, user_id);
    insert_tags(&mut tables, &data.notes, user_id);

    serde_json::json!([Value::Object(tables), Value::Null])
}

fn insert_organizations(
    tables: &mut Map<String, Value>,
    orgs: &[ImportedOrganization],
    user_id: &str,
) {
    if orgs.is_empty() {
        return;
    }

    let entries: Map<String, Value> = orgs
        .iter()
        .map(|org| {
            let value = Organization {
                user_id: user_id.to_string(),
                created_at: normalize_datetime(&org.created_at),
                name: org.name.clone(),
            };
            (org.id.clone(), serde_json::to_value(value).unwrap())
        })
        .collect();

    tables.insert("organizations".to_string(), Value::Object(entries));
}

fn insert_humans(tables: &mut Map<String, Value>, humans: &[ImportedHuman], user_id: &str) {
    if humans.is_empty() {
        return;
    }

    let entries: Map<String, Value> = humans
        .iter()
        .map(|human| {
            let value = Human {
                user_id: user_id.to_string(),
                created_at: normalize_datetime(&human.created_at),
                name: human.name.clone(),
                email: human.email.clone().unwrap_or_default(),
                org_id: human.org_id.clone().unwrap_or_default(),
                job_title: human.job_title.clone().unwrap_or_default(),
                linkedin_username: human.linkedin_username.clone().unwrap_or_default(),
                memo: String::new(),
            };
            (human.id.clone(), serde_json::to_value(value).unwrap())
        })
        .collect();

    tables.insert("humans".to_string(), Value::Object(entries));
}

fn insert_sessions(tables: &mut Map<String, Value>, notes: &[ImportedNote], user_id: &str) {
    if notes.is_empty() {
        return;
    }

    let mut session_entries: Map<String, Value> = Map::new();
    let mut enhanced_note_entries: Map<String, Value> = Map::new();

    for note in notes {
        let session_value = Session {
            user_id: user_id.to_string(),
            created_at: normalize_datetime(&note.created_at),
            folder_id: note.folder_id.clone().unwrap_or_default(),
            event_id: note.event_id.clone().unwrap_or_default(),
            title: note.title.clone(),
            raw_md: note.raw_md.clone().unwrap_or_else(|| note.content.clone()),
        };
        session_entries.insert(
            note.id.clone(),
            serde_json::to_value(session_value).unwrap(),
        );

        if let Some(enhanced_content) = &note.enhanced_content {
            if !enhanced_content.is_empty() {
                let enhanced_note_id = uuid::Uuid::new_v4().to_string();
                let enhanced_note_value = EnhancedNote {
                    user_id: user_id.to_string(),
                    created_at: normalize_datetime(&note.created_at),
                    session_id: note.id.clone(),
                    content: enhanced_content.clone(),
                    position: 1,
                    title: "Summary".to_string(),
                };
                enhanced_note_entries.insert(
                    enhanced_note_id,
                    serde_json::to_value(enhanced_note_value).unwrap(),
                );
            }
        }
    }

    tables.insert("sessions".to_string(), Value::Object(session_entries));

    if !enhanced_note_entries.is_empty() {
        tables.insert(
            "enhanced_notes".to_string(),
            Value::Object(enhanced_note_entries),
        );
    }
}

fn insert_transcripts_and_words(
    tables: &mut Map<String, Value>,
    transcripts: &[ImportedTranscript],
    user_id: &str,
) {
    if transcripts.is_empty() {
        return;
    }

    let mut transcript_entries: Map<String, Value> = Map::new();

    for transcript in transcripts {
        let words_json: Vec<WordInTranscript> = transcript
            .words
            .iter()
            .map(|word| WordInTranscript {
                id: word.id.clone(),
                user_id: user_id.to_string(),
                transcript_id: transcript.id.clone(),
                text: word.text.clone(),
                start_ms: word.start_ms.unwrap_or(0.0) as i64,
                end_ms: word.end_ms.unwrap_or(0.0) as i64,
                channel: 0,
                created_at: chrono::Utc::now().to_rfc3339(),
            })
            .collect();

        let value = Transcript {
            user_id: user_id.to_string(),
            created_at: normalize_datetime(&transcript.created_at),
            session_id: transcript.session_id.clone(),
            started_at: transcript.start_ms.unwrap_or(0.0) as i64,
            ended_at: transcript.end_ms.map(|ms| ms as i64).unwrap_or(0),
            words: serde_json::to_string(&words_json).unwrap_or_else(|_| "[]".to_string()),
            speaker_hints: "[]".to_string(),
        };
        transcript_entries.insert(transcript.id.clone(), serde_json::to_value(value).unwrap());
    }

    tables.insert("transcripts".to_string(), Value::Object(transcript_entries));
}

fn insert_participants(
    tables: &mut Map<String, Value>,
    participants: &[ImportedSessionParticipant],
    user_id: &str,
) {
    if participants.is_empty() {
        return;
    }

    let entries: Map<String, Value> = participants
        .iter()
        .map(|p| {
            let id = format!("{}_{}", p.session_id, p.human_id);
            let value = SessionParticipant {
                user_id: user_id.to_string(),
                created_at: chrono::Utc::now().to_rfc3339(),
                session_id: p.session_id.clone(),
                human_id: p.human_id.clone(),
                source: p.source.clone(),
            };
            (id, serde_json::to_value(value).unwrap())
        })
        .collect();

    tables.insert(
        "mapping_session_participant".to_string(),
        Value::Object(entries),
    );
}

fn insert_tags(tables: &mut Map<String, Value>, notes: &[ImportedNote], user_id: &str) {
    let mut tags: Map<String, Value> = Map::new();
    let mut mappings: Map<String, Value> = Map::new();
    let mut tag_name_to_id: HashMap<String, String> = HashMap::new();

    for note in notes {
        for tag_name in &note.tags {
            let tag_id = tag_name_to_id
                .entry(tag_name.to_string())
                .or_insert_with(|| {
                    uuid::Uuid::new_v5(&uuid::Uuid::NAMESPACE_OID, tag_name.as_bytes()).to_string()
                })
                .clone();

            if !tags.contains_key(&tag_id) {
                let value = Tag {
                    user_id: user_id.to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    name: tag_name.clone(),
                };
                tags.insert(tag_id.clone(), serde_json::to_value(value).unwrap());
            }

            let mapping_id = format!("{}_{}", tag_id, note.id);
            let value = TagSessionMapping {
                user_id: user_id.to_string(),
                created_at: chrono::Utc::now().to_rfc3339(),
                tag_id: tag_id.clone(),
                session_id: note.id.clone(),
            };
            mappings.insert(mapping_id, serde_json::to_value(value).unwrap());
        }
    }

    if !tags.is_empty() {
        tables.insert("tags".to_string(), Value::Object(tags));
    }
    if !mappings.is_empty() {
        tables.insert("mapping_tag_session".to_string(), Value::Object(mappings));
    }
}

fn normalize_datetime(s: &str) -> String {
    if s.is_empty() {
        return chrono::Utc::now().to_rfc3339();
    }

    if chrono::DateTime::parse_from_rfc3339(s).is_ok() {
        return s.to_string();
    }

    if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
        return naive.and_utc().to_rfc3339();
    }

    chrono::Utc::now().to_rfc3339()
}
