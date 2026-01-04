use tantivy::TantivyDocument;
use tantivy::schema::{FAST, Field, STORED, STRING, Schema, TextFieldIndexing, TextOptions, Value};

use crate::SearchDocument;

pub struct SchemaFields {
    pub id: Field,
    pub doc_type: Field,
    pub language: Field,
    pub title: Field,
    pub content: Field,
    pub created_at: Field,
}

pub fn build_schema() -> Schema {
    let mut schema_builder = Schema::builder();
    schema_builder.add_text_field("id", STRING | STORED);
    schema_builder.add_text_field("doc_type", STRING | STORED);
    schema_builder.add_text_field("language", STRING | STORED);

    let text_indexing = TextFieldIndexing::default()
        .set_tokenizer("multilang")
        .set_index_option(tantivy::schema::IndexRecordOption::WithFreqsAndPositions);
    let text_options = TextOptions::default()
        .set_indexing_options(text_indexing)
        .set_stored();

    schema_builder.add_text_field("title", text_options.clone());
    schema_builder.add_text_field("content", text_options);
    schema_builder.add_i64_field("created_at", FAST | STORED);
    schema_builder.build()
}

pub fn get_fields(schema: &Schema) -> SchemaFields {
    SchemaFields {
        id: schema.get_field("id").unwrap(),
        doc_type: schema.get_field("doc_type").unwrap(),
        language: schema.get_field("language").unwrap(),
        title: schema.get_field("title").unwrap(),
        content: schema.get_field("content").unwrap(),
        created_at: schema.get_field("created_at").unwrap(),
    }
}

pub fn extract_search_document(
    _schema: &Schema,
    fields: &SchemaFields,
    doc: &TantivyDocument,
) -> Option<SearchDocument> {
    let id = doc.get_first(fields.id)?.as_str()?.to_string();
    let doc_type = doc.get_first(fields.doc_type)?.as_str()?.to_string();
    let language = doc
        .get_first(fields.language)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let title = doc.get_first(fields.title)?.as_str()?.to_string();
    let content = doc.get_first(fields.content)?.as_str()?.to_string();
    let created_at = doc.get_first(fields.created_at)?.as_i64()?;

    Some(SearchDocument {
        id,
        doc_type,
        language,
        title,
        content,
        created_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_schema_has_language_field() {
        let schema = build_schema();
        assert!(
            schema.get_field("language").is_ok(),
            "Schema should have a language field"
        );
        assert!(
            schema.get_field("title").is_ok(),
            "Schema should have a title field"
        );
        assert!(
            schema.get_field("content").is_ok(),
            "Schema should have a content field"
        );
    }
}
