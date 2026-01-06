use crate::types::{
    ImportSourceInfo, ImportSourceKind, ImportedNote, ImportedTranscript, ImportedTranscriptSegment,
};
use hypr_granola::api::Document;
use hypr_granola::cache::{CacheData, CacheDocument, TranscriptSegment};
use hypr_granola::prosemirror::convert_to_plain_text;
use std::time::Duration;

#[derive(Default)]
pub struct GranolaSource;

impl GranolaSource {
    pub fn info(&self) -> ImportSourceInfo {
        let path = hypr_granola::default_supabase_path()
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "~/Library/Application Support/Granola".to_string());
        ImportSourceInfo {
            kind: ImportSourceKind::Granola,
            name: "Granola".to_string(),
            path,
        }
    }

    pub fn is_available(&self) -> bool {
        hypr_granola::default_supabase_path().exists()
    }

    pub async fn import_notes(&self) -> Result<Vec<ImportedNote>, crate::Error> {
        let supabase_path = hypr_granola::default_supabase_path();
        let supabase_content = std::fs::read(&supabase_path)?;

        let client =
            hypr_granola::api::GranolaClient::new(&supabase_content, Duration::from_secs(30))?;
        let documents = client.get_documents().await?;

        Ok(documents
            .into_iter()
            .map(document_to_imported_note)
            .collect())
    }

    pub async fn import_transcripts(&self) -> Result<Vec<ImportedTranscript>, crate::Error> {
        let cache_path = hypr_granola::cache::default_cache_path();
        let cache_data = hypr_granola::cache::read_cache(&cache_path)?;
        Ok(cache_data_to_imported_transcripts(&cache_data))
    }
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
