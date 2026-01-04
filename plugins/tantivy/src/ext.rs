use tantivy::collector::TopDocs;
use tantivy::query::{BooleanQuery, FuzzyTermQuery, Occur, Query, QueryParser};
use tantivy::{Index, ReloadPolicy, TantivyDocument, Term};
use tauri_plugin_path2::Path2PluginExt;

use crate::query::build_created_at_range_query;
use crate::schema::{extract_search_document, get_fields};
use crate::tokenizer::register_tokenizers;
use crate::{
    CollectionConfig, CollectionIndex, IndexState, SearchDocument, SearchHit, SearchRequest,
    SearchResult,
};

pub fn detect_language(text: &str) -> hypr_language::Language {
    hypr_language::detect(text)
}

pub struct Tantivy<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Tantivy<'a, R, M> {
    pub fn ping(&self) -> Result<(), crate::Error> {
        Ok(())
    }

    pub async fn register_collection(&self, config: CollectionConfig) -> Result<(), crate::Error> {
        let base = self.manager.app_handle().path2().base()?;
        let index_path = base.join(&config.path);

        std::fs::create_dir_all(&index_path)?;

        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        if guard.collections.contains_key(&config.name) {
            tracing::debug!("Collection '{}' already registered", config.name);
            return Ok(());
        }

        let schema = (config.schema_builder)();
        let index = if index_path.join("meta.json").exists() {
            Index::open_in_dir(&index_path)?
        } else {
            Index::create_in_dir(&index_path, schema.clone())?
        };

        register_tokenizers(&index);

        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()?;

        let writer = index.writer(50_000_000)?;

        let collection_index = CollectionIndex {
            schema,
            index,
            reader,
            writer,
        };

        guard
            .collections
            .insert(config.name.clone(), collection_index);

        tracing::info!(
            "Tantivy collection '{}' registered at {:?}",
            config.name,
            index_path
        );
        Ok(())
    }

    fn get_collection_name(collection: Option<String>) -> String {
        collection.unwrap_or_else(|| "default".to_string())
    }

    pub async fn search(&self, request: SearchRequest) -> Result<SearchResult, crate::Error> {
        let collection_name = Self::get_collection_name(request.collection);
        let state = self.manager.state::<IndexState>();
        let guard = state.inner.lock().await;

        let collection_index = guard
            .collections
            .get(&collection_name)
            .ok_or_else(|| crate::Error::CollectionNotFound(collection_name.clone()))?;

        let schema = &collection_index.schema;
        let index = &collection_index.index;
        let reader = &collection_index.reader;

        let fields = get_fields(schema);
        let searcher = reader.searcher();

        let use_fuzzy = request.options.fuzzy.unwrap_or(false);

        let mut combined_query: Box<dyn Query> = if use_fuzzy {
            let distance = request.options.distance.unwrap_or(1);
            let terms: Vec<&str> = request.query.split_whitespace().collect();
            let mut subqueries: Vec<(Occur, Box<dyn Query>)> = Vec::new();

            for term in terms {
                let title_fuzzy =
                    FuzzyTermQuery::new(Term::from_field_text(fields.title, term), distance, true);
                let content_fuzzy = FuzzyTermQuery::new(
                    Term::from_field_text(fields.content, term),
                    distance,
                    true,
                );

                subqueries.push((Occur::Should, Box::new(title_fuzzy)));
                subqueries.push((Occur::Should, Box::new(content_fuzzy)));
            }

            Box::new(BooleanQuery::new(subqueries))
        } else {
            let query_parser = QueryParser::for_index(index, vec![fields.title, fields.content]);
            query_parser.parse_query(&request.query)?
        };

        if let Some(ref created_at_filter) = request.filters.created_at {
            let range_query = build_created_at_range_query(fields.created_at, created_at_filter);
            if let Some(rq) = range_query {
                combined_query = Box::new(BooleanQuery::new(vec![
                    (Occur::Must, combined_query),
                    (Occur::Must, rq),
                ]));
            }
        }

        let top_docs = searcher.search(&combined_query, &TopDocs::with_limit(request.limit))?;

        let mut hits = Vec::new();
        for (score, doc_address) in top_docs {
            let retrieved_doc: TantivyDocument = searcher.doc(doc_address)?;

            if let Some(search_doc) = extract_search_document(schema, &fields, &retrieved_doc) {
                hits.push(SearchHit {
                    score,
                    document: search_doc,
                });
            }
        }

        Ok(SearchResult { hits })
    }

    pub async fn reindex(&self, collection: Option<String>) -> Result<(), crate::Error> {
        let collection_name = Self::get_collection_name(collection);
        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        let collection_index = guard
            .collections
            .get_mut(&collection_name)
            .ok_or_else(|| crate::Error::CollectionNotFound(collection_name.clone()))?;

        let schema = &collection_index.schema;
        let writer = &mut collection_index.writer;

        writer.delete_all_documents()?;

        let fields = get_fields(schema);

        writer.commit()?;

        tracing::info!(
            "Reindex completed for collection '{}'. Index cleared and ready for new documents. Fields: {:?}",
            collection_name,
            fields.id
        );

        Ok(())
    }

    pub async fn add_document(
        &self,
        collection: Option<String>,
        document: SearchDocument,
    ) -> Result<(), crate::Error> {
        let collection_name = Self::get_collection_name(collection);
        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        let collection_index = guard
            .collections
            .get_mut(&collection_name)
            .ok_or_else(|| crate::Error::CollectionNotFound(collection_name.clone()))?;

        let schema = &collection_index.schema;
        let writer = &mut collection_index.writer;
        let fields = get_fields(schema);

        let mut doc = TantivyDocument::new();
        doc.add_text(fields.id, &document.id);
        doc.add_text(fields.doc_type, &document.doc_type);
        doc.add_text(fields.language, document.language.as_deref().unwrap_or(""));
        doc.add_text(fields.title, &document.title);
        doc.add_text(fields.content, &document.content);
        doc.add_i64(fields.created_at, document.created_at);

        writer.add_document(doc)?;
        writer.commit()?;

        tracing::debug!(
            "Added document '{}' to collection '{}'",
            document.id,
            collection_name
        );

        Ok(())
    }

    pub async fn update_document(
        &self,
        collection: Option<String>,
        document: SearchDocument,
    ) -> Result<(), crate::Error> {
        let collection_name = Self::get_collection_name(collection);
        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        let collection_index = guard
            .collections
            .get_mut(&collection_name)
            .ok_or_else(|| crate::Error::CollectionNotFound(collection_name.clone()))?;

        let schema = &collection_index.schema;
        let writer = &mut collection_index.writer;
        let fields = get_fields(schema);

        let id_term = Term::from_field_text(fields.id, &document.id);
        writer.delete_term(id_term);

        let mut doc = TantivyDocument::new();
        doc.add_text(fields.id, &document.id);
        doc.add_text(fields.doc_type, &document.doc_type);
        doc.add_text(fields.language, document.language.as_deref().unwrap_or(""));
        doc.add_text(fields.title, &document.title);
        doc.add_text(fields.content, &document.content);
        doc.add_i64(fields.created_at, document.created_at);

        writer.add_document(doc)?;
        writer.commit()?;

        tracing::debug!(
            "Updated document '{}' in collection '{}'",
            document.id,
            collection_name
        );

        Ok(())
    }

    pub async fn remove_document(
        &self,
        collection: Option<String>,
        id: String,
    ) -> Result<(), crate::Error> {
        let collection_name = Self::get_collection_name(collection);
        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        let collection_index = guard
            .collections
            .get_mut(&collection_name)
            .ok_or_else(|| crate::Error::CollectionNotFound(collection_name.clone()))?;

        let schema = &collection_index.schema;
        let writer = &mut collection_index.writer;
        let fields = get_fields(schema);

        let id_term = Term::from_field_text(fields.id, &id);
        writer.delete_term(id_term);
        writer.commit()?;

        tracing::debug!(
            "Removed document '{}' from collection '{}'",
            id,
            collection_name
        );

        Ok(())
    }
}

pub trait TantivyPluginExt<R: tauri::Runtime> {
    fn tantivy(&self) -> Tantivy<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> TantivyPluginExt<R> for T {
    fn tantivy(&self) -> Tantivy<'_, R, Self>
    where
        Self: Sized,
    {
        Tantivy {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tokenizer::get_tokenizer_name_for_language;

    #[test]
    fn test_detect_language_tokenizer_integration() {
        let text = "The quick brown fox jumps over the lazy dog.";
        let lang = detect_language(text);
        let tokenizer_name = get_tokenizer_name_for_language(&lang);
        assert_eq!(tokenizer_name, "lang_en");
    }
}
