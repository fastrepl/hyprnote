use crate::types::{ImportedNote, ImportedTranscript, ImportedTranscriptSegment, ImportedWord};
use hypr_db_user::{Session, Tag};

pub(super) fn session_to_imported_note(session: Session, tags: Vec<Tag>) -> ImportedNote {
    let content = get_session_content(&session);
    let raw_md = if !session.raw_memo_html.is_empty() {
        Some(strip_html_tags(&session.raw_memo_html))
    } else {
        None
    };

    let enhanced_content = if let Some(ref enhanced) = session.enhanced_memo_html {
        if !enhanced.is_empty() {
            Some(strip_html_tags(enhanced))
        } else {
            None
        }
    } else {
        None
    };

    ImportedNote {
        id: session.id,
        title: session.title,
        content,
        raw_md,
        enhanced_content,
        created_at: session.created_at.to_rfc3339(),
        updated_at: session.visited_at.to_rfc3339(),
        folder_id: None,
        event_id: session.calendar_event_id,
        tags: tags.into_iter().map(|t| t.name).collect(),
    }
}

pub(super) fn session_to_imported_transcript(session: Session) -> ImportedTranscript {
    let record_start_ms = session
        .record_start
        .map(|dt| dt.timestamp_millis() as u64)
        .or_else(|| session.words.first().and_then(|w| w.start_ms));

    let texts_with_spacing = fix_spacing_for_words(
        session
            .words
            .iter()
            .map(|w| w.text.as_str())
            .collect::<Vec<_>>(),
    );

    let words: Vec<ImportedWord> = session
        .words
        .iter()
        .enumerate()
        .map(|(idx, word)| {
            let speaker = get_speaker_label(&word.speaker);
            let relative_start_ms = compute_relative_ms(word.start_ms, record_start_ms);
            let relative_end_ms = compute_relative_ms(word.end_ms, record_start_ms);

            ImportedWord {
                id: format!("{}-{}", session.id, idx),
                start_ms: relative_start_ms,
                end_ms: relative_end_ms,
                text: texts_with_spacing[idx].clone(),
                speaker,
            }
        })
        .collect();

    let segments: Vec<ImportedTranscriptSegment> = session
        .words
        .iter()
        .enumerate()
        .map(|(idx, word)| {
            let speaker = get_speaker_label(&word.speaker);
            let relative_start_ms = compute_relative_ms(word.start_ms, record_start_ms);
            let relative_end_ms = compute_relative_ms(word.end_ms, record_start_ms);

            ImportedTranscriptSegment {
                id: format!("{}-{}", session.id, idx),
                start_timestamp: relative_start_ms
                    .map(|ms| format_timestamp(ms as u64))
                    .unwrap_or_default(),
                end_timestamp: relative_end_ms
                    .map(|ms| format_timestamp(ms as u64))
                    .unwrap_or_default(),
                text: texts_with_spacing[idx].clone(),
                speaker,
            }
        })
        .collect();

    ImportedTranscript {
        id: session.id.clone(),
        session_id: session.id.clone(),
        title: session.title,
        created_at: session.created_at.to_rfc3339(),
        updated_at: session.visited_at.to_rfc3339(),
        segments,
        words,
        start_ms: session.record_start.map(|dt| dt.timestamp_millis() as f64),
        end_ms: session.record_end.map(|dt| dt.timestamp_millis() as f64),
    }
}

fn get_speaker_label(speaker: &Option<owhisper_interface::SpeakerIdentity>) -> String {
    match speaker {
        Some(owhisper_interface::SpeakerIdentity::Assigned { label, .. }) => label.clone(),
        Some(owhisper_interface::SpeakerIdentity::Unassigned { index }) => {
            format!("Speaker {}", index)
        }
        None => "Unknown".to_string(),
    }
}

fn compute_relative_ms(absolute_ms: Option<u64>, base_ms: Option<u64>) -> Option<f64> {
    match (absolute_ms, base_ms) {
        (Some(abs), Some(base)) => Some(abs.saturating_sub(base) as f64),
        _ => None,
    }
}

fn get_session_content(session: &Session) -> String {
    if let Some(ref enhanced) = session.enhanced_memo_html
        && !enhanced.is_empty()
    {
        return strip_html_tags(enhanced);
    }

    if !session.raw_memo_html.is_empty() {
        return strip_html_tags(&session.raw_memo_html);
    }

    String::new()
}

fn strip_html_tags(html: &str) -> String {
    let pre_processed = html
        .replace("</div>", "\n")
        .replace("</p>", "\n\n")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n");

    let mut result = String::new();
    let mut in_tag = false;

    for c in pre_processed.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => result.push(c),
            _ => {}
        }
    }

    result
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .trim()
        .to_string()
}

fn format_timestamp(ms: u64) -> String {
    let total_seconds = ms / 1000;
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    let millis = ms % 1000;

    format!("{:02}:{:02}:{:02}.{:03}", hours, minutes, seconds, millis)
}

fn fix_spacing_for_words(words: Vec<&str>) -> Vec<String> {
    words
        .iter()
        .map(|word| {
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
        })
        .collect()
}

fn should_skip_leading_space(word: &str) -> bool {
    match word.chars().next() {
        None => true,
        Some(c) => {
            matches!(
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
            )
        }
    }
}
