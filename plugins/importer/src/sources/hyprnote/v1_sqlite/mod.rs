use crate::types::{
    ImportResult, ImportedEnhancedNote, ImportedHuman, ImportedNote, ImportedOrganization,
    ImportedSessionParticipant, ImportedTemplate, ImportedTemplateSection, ImportedTranscript,
    ImportedWord,
};
use hypr_db_core::libsql;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

type Row = HashMap<String, Value>;
type TableRows<'a> = Vec<(&'a str, Row)>;
type WordsAndHints = (HashMap<String, Vec<(String, Row)>>, HashMap<String, String>);

pub async fn import_all_from_path(path: &Path) -> Result<ImportResult, crate::Error> {
    let db = libsql::Builder::new_local(path).build().await?;
    let conn = db.connect()?;

    let mut rows = conn
        .query("SELECT store FROM main WHERE id = '_'", ())
        .await?;
    let row = rows
        .next()
        .await?
        .ok_or_else(|| crate::Error::InvalidData("No store data found".to_string()))?;
    let store_json: String = row.get(0)?;

    let store: Value = serde_json::from_str(&store_json)?;
    let tables = extract_tables(&store)?;

    let sessions = extract_table_rows(tables, "sessions");
    let transcripts_data = extract_table_rows(tables, "transcripts");
    let humans_data = extract_table_rows(tables, "humans");
    let organizations_data = extract_table_rows(tables, "organizations");
    let participants_data = extract_table_rows(tables, "mapping_session_participant");
    let templates_data = extract_table_rows(tables, "templates");
    let enhanced_notes_data = extract_table_rows(tables, "enhanced_notes");

    let has_inline_words = transcripts_data
        .first()
        .is_some_and(|(_, row)| row.contains_key("words"));

    let (words_by_transcript, speaker_hints_by_word) = if has_inline_words {
        extract_inline_words_and_hints(&transcripts_data)
    } else {
        let words_data = extract_table_rows(tables, "words");
        let speaker_hints_data = extract_table_rows(tables, "speaker_hints");
        (
            group_words_by_transcript(words_data),
            build_speaker_hints_map(&speaker_hints_data),
        )
    };

    let notes = build_notes(&sessions);
    let enhanced_notes = build_enhanced_notes(&enhanced_notes_data);
    let transcripts = build_transcripts(
        &transcripts_data,
        &words_by_transcript,
        &sessions,
        &speaker_hints_by_word,
    );
    let humans = build_humans(&humans_data);
    let organizations = build_organizations(&organizations_data);
    let participants = build_participants(&participants_data);
    let templates = build_templates(&templates_data);

    Ok(ImportResult {
        notes,
        transcripts,
        humans,
        organizations,
        participants,
        templates,
        enhanced_notes,
    })
}

fn extract_tables(store: &Value) -> Result<&serde_json::Map<String, Value>, crate::Error> {
    store
        .get(0)
        .and_then(|v| v.get(0))
        .and_then(|v| v.as_object())
        .ok_or_else(|| crate::Error::InvalidData("Invalid TinyBase store structure".to_string()))
}

fn extract_table_rows<'a>(
    tables: &'a serde_json::Map<String, Value>,
    table_name: &str,
) -> TableRows<'a> {
    let rows_obj = tables
        .get(table_name)
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.first())
        .and_then(|v| v.as_object());

    let Some(rows_obj) = rows_obj else {
        return vec![];
    };

    rows_obj
        .iter()
        .filter_map(|(row_id, row_data)| {
            let row = parse_row(row_data)?;
            if is_tombstone(&row) {
                return None;
            }
            Some((row_id.as_str(), row))
        })
        .collect()
}

fn parse_row(row_data: &Value) -> Option<Row> {
    let cells = row_data.get(0)?.as_object()?;
    let mut row = HashMap::new();

    for (col_name, cell_data) in cells {
        if let Some(value) = cell_data.get(0) {
            row.insert(col_name.clone(), value.clone());
        }
    }

    Some(row)
}

fn is_tombstone(row: &Row) -> bool {
    row.values().any(|v| {
        if let Some(s) = v.as_str() {
            s == "\u{FFFC}"
        } else {
            false
        }
    })
}

fn get_str<'a>(row: &'a Row, key: &str) -> &'a str {
    row.get(key).and_then(|v| v.as_str()).unwrap_or("")
}

fn get_optional_str<'a>(row: &'a Row, key: &str) -> Option<&'a str> {
    row.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
}

fn get_f64(row: &Row, key: &str) -> Option<f64> {
    row.get(key)
        .and_then(|v| v.as_f64().or_else(|| v.as_i64().map(|n| n as f64)))
}

fn group_words_by_transcript(words: TableRows<'_>) -> HashMap<String, Vec<(String, Row)>> {
    let mut grouped: HashMap<String, Vec<(String, Row)>> = HashMap::new();

    for (word_id, word) in words {
        let transcript_id = get_str(&word, "transcript_id");
        if !transcript_id.is_empty() {
            grouped
                .entry(transcript_id.to_string())
                .or_default()
                .push((word_id.to_string(), word));
        }
    }

    for words in grouped.values_mut() {
        words.sort_by(|a, b| {
            let start_a = get_f64(&a.1, "start_ms").unwrap_or(0.0);
            let start_b = get_f64(&b.1, "start_ms").unwrap_or(0.0);
            start_a
                .partial_cmp(&start_b)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    grouped
}

fn build_speaker_hints_map(speaker_hints: &TableRows<'_>) -> HashMap<String, String> {
    let mut hints = HashMap::with_capacity(speaker_hints.len());

    for (_, hint) in speaker_hints {
        let word_id = get_str(hint, "word_id");
        let hint_type = get_str(hint, "type");

        if word_id.is_empty() {
            continue;
        }

        if let Some(value) = get_optional_str(hint, "value") {
            let label = parse_speaker_hint_value(hint_type, value);
            if let Some(label) = label {
                hints.insert(word_id.to_string(), label);
            }
        }
    }

    hints
}

fn parse_speaker_hint_value(hint_type: &str, value: &str) -> Option<String> {
    match hint_type {
        "speaker_label" | "label" => {
            let parsed = serde_json::from_str::<Value>(value).ok()?;
            parsed
                .get("label")
                .and_then(|v| v.as_str())
                .map(String::from)
                .or_else(|| Some(value.to_string()))
        }
        "provider_speaker_index" => {
            let parsed = serde_json::from_str::<Value>(value).ok()?;
            let speaker_index = parsed.get("speaker_index").and_then(|v| v.as_i64())?;
            Some(format!("Speaker {}", speaker_index))
        }
        _ => None,
    }
}

fn extract_inline_words_and_hints(transcripts: &TableRows<'_>) -> WordsAndHints {
    let mut words_by_transcript = HashMap::with_capacity(transcripts.len());
    let mut speaker_hints = HashMap::new();

    for (transcript_id, transcript) in transcripts {
        if let Some(words_json) = get_optional_str(transcript, "words")
            && let Ok(words_array) = serde_json::from_str::<Vec<Value>>(words_json)
        {
            let mut words = Vec::with_capacity(words_array.len());

            for word_value in words_array {
                let Some(word_obj) = word_value.as_object() else {
                    continue;
                };
                let Some(word_id) = word_obj.get("id").and_then(|v| v.as_str()) else {
                    continue;
                };

                if let Some(speaker) = word_obj
                    .get("speaker")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                {
                    speaker_hints.insert(word_id.to_string(), speaker.to_string());
                }

                let row: Row = word_obj
                    .iter()
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect();
                words.push((word_id.to_string(), row));
            }

            words.sort_by(|a, b| {
                let start_a = get_f64(&a.1, "start_ms").unwrap_or(0.0);
                let start_b = get_f64(&b.1, "start_ms").unwrap_or(0.0);
                start_a
                    .partial_cmp(&start_b)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            words_by_transcript.insert((*transcript_id).to_string(), words);
        }

        if let Some(hints_json) = get_optional_str(transcript, "speaker_hints")
            && let Ok(hints_array) = serde_json::from_str::<Vec<Value>>(hints_json)
        {
            for hint_value in hints_array {
                let Some(hint_obj) = hint_value.as_object() else {
                    continue;
                };

                let word_id = hint_obj
                    .get("word_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let hint_type = hint_obj.get("type").and_then(|v| v.as_str()).unwrap_or("");

                if word_id.is_empty() {
                    continue;
                }

                if let Some(value) = hint_obj
                    .get("value")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    && let Some(label) = parse_speaker_hint_value(hint_type, value)
                {
                    speaker_hints.insert(word_id.to_string(), label);
                }
            }
        }
    }

    (words_by_transcript, speaker_hints)
}

fn build_notes(sessions: &TableRows<'_>) -> Vec<ImportedNote> {
    sessions
        .iter()
        .filter_map(|(session_id, session)| {
            let title = get_str(session, "title");
            let created_at = get_str(session, "created_at");
            let raw_md = get_optional_str(session, "raw_md");

            if title.is_empty() && raw_md.is_none() {
                return None;
            }

            Some(ImportedNote {
                id: (*session_id).to_string(),
                title: title.to_string(),
                content: raw_md.unwrap_or("").to_string(),
                raw_md: raw_md.map(String::from),
                enhanced_content: None,
                created_at: created_at.to_string(),
                updated_at: created_at.to_string(),
                folder_id: None,
                event_id: None,
                tags: vec![],
            })
        })
        .collect()
}

fn build_enhanced_notes(enhanced_notes_data: &TableRows<'_>) -> Vec<ImportedEnhancedNote> {
    enhanced_notes_data
        .iter()
        .filter_map(|(note_id, note)| {
            let session_id = get_str(note, "session_id");
            let content = get_str(note, "content");

            if session_id.is_empty() || content.is_empty() {
                return None;
            }

            let position = note.get("position").and_then(|v| v.as_i64()).unwrap_or(1) as i32;

            Some(ImportedEnhancedNote {
                id: (*note_id).to_string(),
                session_id: session_id.to_string(),
                content: content.to_string(),
                template_id: get_optional_str(note, "template_id").map(String::from),
                position,
                title: get_str(note, "title").to_string(),
            })
        })
        .collect()
}

fn build_transcripts(
    transcripts: &TableRows<'_>,
    words_by_transcript: &HashMap<String, Vec<(String, Row)>>,
    sessions: &TableRows<'_>,
    speaker_hints: &HashMap<String, String>,
) -> Vec<ImportedTranscript> {
    let session_titles: HashMap<&str, &str> = sessions
        .iter()
        .map(|(id, row)| (*id, get_str(row, "title")))
        .collect();

    transcripts
        .iter()
        .filter_map(|(transcript_id, transcript)| {
            let session_id = get_str(transcript, "session_id");
            let created_at = get_str(transcript, "created_at");
            let started_at = get_f64(transcript, "started_at").unwrap_or(0.0);

            let words_data = words_by_transcript
                .get(*transcript_id)
                .filter(|w| !w.is_empty())?;
            let title = session_titles.get(session_id).copied().unwrap_or("");

            let words: Vec<ImportedWord> = words_data
                .iter()
                .map(|(word_id, word)| {
                    let start_ms = get_f64(word, "start_ms");
                    let end_ms = get_f64(word, "end_ms");
                    let text = get_str(word, "text").to_string();
                    let channel = word.get("channel").and_then(|v| v.as_i64()).unwrap_or(0);

                    let speaker = speaker_hints
                        .get(word_id)
                        .map(String::as_str)
                        .or_else(|| get_optional_str(word, "speaker"))
                        .map(String::from)
                        .unwrap_or_else(|| format!("Speaker {}", channel));

                    ImportedWord {
                        id: word_id.clone(),
                        start_ms: start_ms.map(|ms| ms - started_at),
                        end_ms: end_ms.map(|ms| ms - started_at),
                        text,
                        speaker,
                    }
                })
                .collect();

            let start_ms = words.first().and_then(|w| w.start_ms);
            let end_ms = words.last().and_then(|w| w.end_ms);

            Some(ImportedTranscript {
                id: (*transcript_id).to_string(),
                session_id: session_id.to_string(),
                title: title.to_string(),
                created_at: created_at.to_string(),
                updated_at: created_at.to_string(),
                segments: vec![],
                words,
                start_ms,
                end_ms,
            })
        })
        .collect()
}

fn build_humans(humans: &TableRows<'_>) -> Vec<ImportedHuman> {
    const NULL_UUID: &str = "00000000-0000-0000-0000-000000000000";

    humans
        .iter()
        .filter(|(id, _)| *id != NULL_UUID)
        .map(|(id, human)| ImportedHuman {
            id: (*id).to_string(),
            created_at: get_str(human, "created_at").to_string(),
            name: get_str(human, "name").to_string(),
            email: get_optional_str(human, "email").map(String::from),
            org_id: get_optional_str(human, "org_id").map(String::from),
            job_title: get_optional_str(human, "job_title").map(String::from),
            linkedin_username: get_optional_str(human, "linkedin_username").map(String::from),
        })
        .collect()
}

fn build_organizations(organizations: &TableRows<'_>) -> Vec<ImportedOrganization> {
    organizations
        .iter()
        .filter(|(id, _)| *id != "0")
        .map(|(id, org)| ImportedOrganization {
            id: (*id).to_string(),
            created_at: get_str(org, "created_at").to_string(),
            name: get_str(org, "name").to_string(),
            description: None,
        })
        .collect()
}

fn build_participants(participants: &TableRows<'_>) -> Vec<ImportedSessionParticipant> {
    participants
        .iter()
        .filter_map(|(_, participant)| {
            let session_id = get_str(participant, "session_id");
            let human_id = get_str(participant, "human_id");

            if session_id.is_empty() || human_id.is_empty() {
                return None;
            }

            Some(ImportedSessionParticipant {
                session_id: session_id.to_string(),
                human_id: human_id.to_string(),
                source: "imported".to_string(),
            })
        })
        .collect()
}

fn build_templates(templates: &TableRows<'_>) -> Vec<ImportedTemplate> {
    templates
        .iter()
        .filter_map(|(id, template)| {
            let title = get_str(template, "title");
            if title.is_empty() {
                return None;
            }

            let sections_json = get_str(template, "sections");
            let sections: Vec<ImportedTemplateSection> =
                serde_json::from_str(sections_json).unwrap_or_default();

            Some(ImportedTemplate {
                id: (*id).to_string(),
                title: title.to_string(),
                description: get_str(template, "description").to_string(),
                sections,
                tags: vec![],
                context_option: None,
            })
        })
        .collect()
}
