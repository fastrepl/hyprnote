use crate::types::{
    ImportResult, ImportedHuman, ImportedNote, ImportedOrganization, ImportedSessionParticipant,
    ImportedTemplate, ImportedTemplateSection, ImportedTranscript, ImportedWord,
};
use hypr_db_core::libsql;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

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

    let sessions = extract_table_rows(&tables, "sessions");
    let transcripts_data = extract_table_rows(&tables, "transcripts");
    let humans_data = extract_table_rows(&tables, "humans");
    let organizations_data = extract_table_rows(&tables, "organizations");
    let participants_data = extract_table_rows(&tables, "mapping_session_participant");
    let templates_data = extract_table_rows(&tables, "templates");
    let enhanced_notes_data = extract_table_rows(&tables, "enhanced_notes");

    let has_inline_words = transcripts_data
        .first()
        .map(|(_, row)| row.contains_key("words"))
        .unwrap_or(false);

    let (words_by_transcript, speaker_hints_by_word) = if has_inline_words {
        extract_inline_words_and_hints(&transcripts_data)
    } else {
        let words_data = extract_table_rows(&tables, "words");
        let speaker_hints_data = extract_table_rows(&tables, "speaker_hints");
        (
            group_words_by_transcript(&words_data),
            build_speaker_hints_map(&speaker_hints_data),
        )
    };

    let enhanced_by_session = group_enhanced_by_session(&enhanced_notes_data);

    let notes = build_notes(&sessions, &enhanced_by_session);
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
    })
}

fn extract_tables(store: &Value) -> Result<HashMap<String, Value>, crate::Error> {
    let tables = store
        .get(0)
        .and_then(|v| v.get(0))
        .and_then(|v| v.as_object())
        .ok_or_else(|| crate::Error::InvalidData("Invalid TinyBase store structure".to_string()))?;

    Ok(tables.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
}

fn extract_table_rows(tables: &HashMap<String, Value>, table_name: &str) -> Vec<(String, Row)> {
    let Some(table) = tables.get(table_name) else {
        return vec![];
    };

    let Some(table_list) = table.as_array() else {
        return vec![];
    };

    let Some(rows_obj) = table_list.first().and_then(|v| v.as_object()) else {
        return vec![];
    };

    rows_obj
        .iter()
        .filter_map(|(row_id, row_data)| {
            let row = parse_row(row_data)?;
            if is_tombstone(&row) {
                return None;
            }
            Some((row_id.clone(), row))
        })
        .collect()
}

type Row = HashMap<String, Value>;

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

fn get_string(row: &Row, key: &str) -> String {
    row.get(key)
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

fn get_optional_string(row: &Row, key: &str) -> Option<String> {
    row.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn get_f64(row: &Row, key: &str) -> Option<f64> {
    row.get(key).and_then(|v| {
        if let Some(n) = v.as_f64() {
            Some(n)
        } else if let Some(n) = v.as_i64() {
            Some(n as f64)
        } else {
            None
        }
    })
}

fn group_words_by_transcript(words: &[(String, Row)]) -> HashMap<String, Vec<(String, Row)>> {
    let mut grouped: HashMap<String, Vec<(String, Row)>> = HashMap::new();

    for (word_id, word) in words {
        let transcript_id = get_string(word, "transcript_id");
        if !transcript_id.is_empty() {
            grouped
                .entry(transcript_id)
                .or_default()
                .push((word_id.clone(), word.clone()));
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

fn group_enhanced_by_session(
    enhanced_notes: &[(String, Row)],
) -> HashMap<String, Vec<(String, Row)>> {
    let mut grouped: HashMap<String, Vec<(String, Row)>> = HashMap::new();

    for (id, note) in enhanced_notes {
        let session_id = get_string(note, "session_id");
        if !session_id.is_empty() {
            grouped
                .entry(session_id)
                .or_default()
                .push((id.clone(), note.clone()));
        }
    }

    grouped
}

fn build_speaker_hints_map(speaker_hints: &[(String, Row)]) -> HashMap<String, String> {
    let mut hints: HashMap<String, String> = HashMap::new();

    for (_, hint) in speaker_hints {
        let word_id = get_string(hint, "word_id");
        let hint_type = get_string(hint, "type");

        if word_id.is_empty() {
            continue;
        }

        if hint_type == "speaker_label" || hint_type == "label" {
            if let Some(value) = get_optional_string(hint, "value") {
                if let Ok(parsed) = serde_json::from_str::<Value>(&value) {
                    if let Some(label) = parsed.get("label").and_then(|v| v.as_str()) {
                        hints.insert(word_id, label.to_string());
                    }
                } else {
                    hints.insert(word_id, value);
                }
            }
        }
    }

    hints
}

fn extract_inline_words_and_hints(
    transcripts: &[(String, Row)],
) -> (HashMap<String, Vec<(String, Row)>>, HashMap<String, String>) {
    let mut words_by_transcript: HashMap<String, Vec<(String, Row)>> = HashMap::new();
    let mut speaker_hints: HashMap<String, String> = HashMap::new();

    for (transcript_id, transcript) in transcripts {
        if let Some(words_json) = get_optional_string(transcript, "words") {
            if let Ok(words_array) = serde_json::from_str::<Vec<Value>>(&words_json) {
                let mut words: Vec<(String, Row)> = words_array
                    .into_iter()
                    .filter_map(|word_value| {
                        let word_obj = word_value.as_object()?;
                        let word_id = word_obj.get("id")?.as_str()?.to_string();

                        let mut row: Row = HashMap::new();
                        for (k, v) in word_obj {
                            row.insert(k.clone(), v.clone());
                        }

                        if let Some(speaker) = word_obj.get("speaker").and_then(|v| v.as_str()) {
                            if !speaker.is_empty() {
                                speaker_hints.insert(word_id.clone(), speaker.to_string());
                            }
                        }

                        Some((word_id, row))
                    })
                    .collect();

                words.sort_by(|a, b| {
                    let start_a = get_f64(&a.1, "start_ms").unwrap_or(0.0);
                    let start_b = get_f64(&b.1, "start_ms").unwrap_or(0.0);
                    start_a
                        .partial_cmp(&start_b)
                        .unwrap_or(std::cmp::Ordering::Equal)
                });

                words_by_transcript.insert(transcript_id.clone(), words);
            }
        }

        if let Some(hints_json) = get_optional_string(transcript, "speaker_hints") {
            if let Ok(hints_array) = serde_json::from_str::<Vec<Value>>(&hints_json) {
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

                    if hint_type == "speaker_label" || hint_type == "label" {
                        if let Some(value) = hint_obj.get("value").and_then(|v| v.as_str()) {
                            if let Ok(parsed) = serde_json::from_str::<Value>(value) {
                                if let Some(label) = parsed.get("label").and_then(|v| v.as_str()) {
                                    speaker_hints.insert(word_id.to_string(), label.to_string());
                                }
                            } else if !value.is_empty() {
                                speaker_hints.insert(word_id.to_string(), value.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    (words_by_transcript, speaker_hints)
}

fn build_notes(
    sessions: &[(String, Row)],
    enhanced_by_session: &HashMap<String, Vec<(String, Row)>>,
) -> Vec<ImportedNote> {
    sessions
        .iter()
        .filter_map(|(session_id, session)| {
            let title = get_string(session, "title");
            let created_at = get_string(session, "created_at");
            let raw_md = get_optional_string(session, "raw_md");
            let enhanced_md = get_optional_string(session, "enhanced_md");

            let enhanced_content = enhanced_by_session
                .get(session_id)
                .and_then(|notes| notes.first())
                .map(|(_, note)| get_string(note, "content"))
                .filter(|s| !s.is_empty())
                .or_else(|| enhanced_md.clone());

            let content = enhanced_content
                .clone()
                .or_else(|| raw_md.clone())
                .unwrap_or_default();

            if title.is_empty() && content.is_empty() && raw_md.is_none() {
                return None;
            }

            Some(ImportedNote {
                id: session_id.clone(),
                title,
                content,
                raw_md,
                enhanced_content,
                created_at: created_at.clone(),
                updated_at: created_at,
                folder_id: None,
                event_id: None,
                tags: vec![],
            })
        })
        .collect()
}

fn build_transcripts(
    transcripts: &[(String, Row)],
    words_by_transcript: &HashMap<String, Vec<(String, Row)>>,
    sessions: &[(String, Row)],
    speaker_hints: &HashMap<String, String>,
) -> Vec<ImportedTranscript> {
    let session_titles: HashMap<String, String> = sessions
        .iter()
        .map(|(id, row)| (id.clone(), get_string(row, "title")))
        .collect();

    transcripts
        .iter()
        .filter_map(|(transcript_id, transcript)| {
            let session_id = get_string(transcript, "session_id");
            let created_at = get_string(transcript, "created_at");
            let started_at = get_f64(transcript, "started_at");

            let words_data = words_by_transcript.get(transcript_id)?;
            if words_data.is_empty() {
                return None;
            }

            let title = session_titles.get(&session_id).cloned().unwrap_or_default();

            let words: Vec<ImportedWord> = words_data
                .iter()
                .map(|(word_id, word)| {
                    let start_ms = get_f64(word, "start_ms");
                    let end_ms = get_f64(word, "end_ms");
                    let text = fix_word_spacing(&get_string(word, "text"));
                    let channel = word.get("channel").and_then(|v| v.as_i64()).unwrap_or(0);

                    let speaker = speaker_hints
                        .get(word_id)
                        .cloned()
                        .or_else(|| get_optional_string(word, "speaker"))
                        .unwrap_or_else(|| format!("Speaker {}", channel));

                    ImportedWord {
                        id: word_id.clone(),
                        start_ms: start_ms.map(|ms| ms - started_at.unwrap_or(0.0)),
                        end_ms: end_ms.map(|ms| ms - started_at.unwrap_or(0.0)),
                        text,
                        speaker,
                    }
                })
                .collect();

            let start_ms = words.first().and_then(|w| w.start_ms);
            let end_ms = words.last().and_then(|w| w.end_ms);

            Some(ImportedTranscript {
                id: transcript_id.clone(),
                session_id,
                title,
                created_at: created_at.clone(),
                updated_at: created_at,
                segments: vec![],
                words,
                start_ms,
                end_ms,
            })
        })
        .collect()
}

fn build_humans(humans: &[(String, Row)]) -> Vec<ImportedHuman> {
    humans
        .iter()
        .filter(|(id, _)| id != "00000000-0000-0000-0000-000000000000")
        .map(|(id, human)| ImportedHuman {
            id: id.clone(),
            created_at: get_string(human, "created_at"),
            name: get_string(human, "name"),
            email: get_optional_string(human, "email"),
            org_id: get_optional_string(human, "org_id"),
            job_title: get_optional_string(human, "job_title"),
            linkedin_username: get_optional_string(human, "linkedin_username"),
        })
        .collect()
}

fn build_organizations(organizations: &[(String, Row)]) -> Vec<ImportedOrganization> {
    organizations
        .iter()
        .filter(|(id, _)| id != "0")
        .map(|(id, org)| ImportedOrganization {
            id: id.clone(),
            created_at: get_string(org, "created_at"),
            name: get_string(org, "name"),
            description: get_optional_string(org, "description"),
        })
        .collect()
}

fn build_participants(participants: &[(String, Row)]) -> Vec<ImportedSessionParticipant> {
    participants
        .iter()
        .filter_map(|(_, participant)| {
            let session_id = get_string(participant, "session_id");
            let human_id = get_string(participant, "human_id");

            if session_id.is_empty() || human_id.is_empty() {
                return None;
            }

            Some(ImportedSessionParticipant {
                session_id,
                human_id,
                source: "imported".to_string(),
            })
        })
        .collect()
}

fn build_templates(templates: &[(String, Row)]) -> Vec<ImportedTemplate> {
    templates
        .iter()
        .filter_map(|(id, template)| {
            let title = get_string(template, "title");
            if title.is_empty() {
                return None;
            }

            let sections_json = get_string(template, "sections");
            let sections: Vec<ImportedTemplateSection> =
                serde_json::from_str(&sections_json).unwrap_or_default();

            Some(ImportedTemplate {
                id: id.clone(),
                title,
                description: get_string(template, "description"),
                sections,
                tags: vec![],
                context_option: None,
            })
        })
        .collect()
}

fn fix_word_spacing(word: &str) -> String {
    let trimmed = word.trim();
    if trimmed.is_empty() {
        return word.to_string();
    }

    if word.starts_with(' ') {
        return word.to_string();
    }

    if should_skip_leading_space(trimmed) {
        return trimmed.to_string();
    }

    format!(" {}", trimmed)
}

fn should_skip_leading_space(word: &str) -> bool {
    match word.chars().next() {
        None => true,
        Some(c) => matches!(
            c,
            '\'' | '\u{2019}'
                | ','
                | '.'
                | '!'
                | '?'
                | ':'
                | ';'
                | ')'
                | ']'
                | '}'
                | '"'
                | '\u{201D}'
        ),
    }
}
