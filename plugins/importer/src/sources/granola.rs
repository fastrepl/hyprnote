use crate::types::{ImportResult, ImportedNote, ImportedTranscript, ImportedTranscriptSegment};
use hypr_granola::api::Document;
use hypr_granola::cache::{CacheData, CacheDocument, TranscriptSegment};
use hypr_granola::prosemirror::convert_to_plain_text;
use std::path::Path;
use std::time::Duration;

pub async fn import_all_from_path(path: &Path) -> Result<ImportResult, crate::Error> {
    let supabase_content = std::fs::read(path)?;

    let client = hypr_granola::api::GranolaClient::new(&supabase_content, Duration::from_secs(30))?;
    let documents = client.get_documents().await?;

    let notes = documents
        .into_iter()
        .map(document_to_imported_note)
        .collect();

    let cache_path = path
        .parent()
        .map(|p| p.join("cache"))
        .unwrap_or_else(hypr_granola::cache::default_cache_path);
    let transcripts = if cache_path.exists() {
        let cache_data = hypr_granola::cache::read_cache(&cache_path)?;
        cache_data_to_imported_transcripts(&cache_data)
    } else {
        vec![]
    };

    Ok(ImportResult {
        notes,
        transcripts,
        humans: vec![],
        organizations: vec![],
        participants: vec![],
        templates: vec![],
    })
}

fn document_to_imported_note(doc: Document) -> ImportedNote {
    let content = get_document_content(&doc);

    ImportedNote {
        id: doc.id,
        title: doc.title,
        content: content.clone(),
        raw_md: Some(content),
        enhanced_content: None,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        folder_id: None,
        event_id: None,
        tags: doc.tags,
    }
}

fn get_document_content(doc: &Document) -> String {
    if let Some(ref notes) = doc.notes {
        let content = convert_to_plain_text(notes).trim().to_string();
        if !content.is_empty() {
            return content;
        }
    }

    if let Some(ref panel) = doc.last_viewed_panel {
        if let Some(ref content) = panel.content {
            let text = convert_to_plain_text(content).trim().to_string();
            if !text.is_empty() {
                return text;
            }
        }

        if !panel.original_content.is_empty() {
            return panel.original_content.clone();
        }
    }

    doc.content.clone()
}

fn cache_data_to_imported_transcripts(cache_data: &CacheData) -> Vec<ImportedTranscript> {
    cache_data
        .transcripts
        .iter()
        .filter_map(|(doc_id, segments)| {
            if segments.is_empty() {
                return None;
            }

            let doc = cache_data
                .documents
                .get(doc_id)
                .cloned()
                .unwrap_or_else(|| CacheDocument {
                    id: doc_id.clone(),
                    title: doc_id.clone(),
                    created_at: String::new(),
                    updated_at: String::new(),
                });

            Some(cache_document_to_imported_transcript(&doc, segments))
        })
        .collect()
}

fn cache_document_to_imported_transcript(
    doc: &CacheDocument,
    segments: &[TranscriptSegment],
) -> ImportedTranscript {
    let imported_segments: Vec<ImportedTranscriptSegment> = segments
        .iter()
        .map(|seg| ImportedTranscriptSegment {
            id: seg.id.clone(),
            start_timestamp: seg.start_timestamp.clone(),
            end_timestamp: seg.end_timestamp.clone(),
            text: seg.text.clone(),
            speaker: match seg.source.as_str() {
                "microphone" => "You".to_string(),
                _ => "System".to_string(),
            },
        })
        .collect();

    ImportedTranscript {
        id: doc.id.clone(),
        session_id: doc.id.clone(),
        title: doc.title.clone(),
        created_at: doc.created_at.clone(),
        updated_at: doc.updated_at.clone(),
        segments: imported_segments,
        words: vec![],
        start_ms: None,
        end_ms: None,
    }
}
