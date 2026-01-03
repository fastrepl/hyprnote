use tantivy::collector::TopDocs;
use tantivy::query::{BooleanQuery, FuzzyTermQuery, Occur, Query, QueryParser, RangeQuery};
use tantivy::schema::{FAST, Field, STORED, STRING, Schema, TEXT, Value};
use tantivy::{Index, ReloadPolicy, TantivyDocument, Term};
use tauri_plugin_path2::Path2PluginExt;

use crate::{IndexState, SearchDocument, SearchFilters, SearchHit, SearchResult};

pub struct Tantivy<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Tantivy<'a, R, M> {
    pub fn ping(&self) -> Result<(), crate::Error> {
        Ok(())
    }

    pub async fn init(&self) -> Result<(), crate::Error> {
        let base = self.manager.app_handle().path2().base()?;
        let index_path = base.join("search_index");

        std::fs::create_dir_all(&index_path)?;

        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        if guard.index.is_some() {
            return Ok(());
        }

        let schema = build_schema();
        let index = if index_path.join("meta.json").exists() {
            Index::open_in_dir(&index_path)?
        } else {
            Index::create_in_dir(&index_path, schema.clone())?
        };

        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()?;

        let writer = index.writer(50_000_000)?;

        guard.schema = Some(schema);
        guard.index = Some(index);
        guard.reader = Some(reader);
        guard.writer = Some(writer);

        tracing::info!("Tantivy search index initialized at {:?}", index_path);
        Ok(())
    }

    pub async fn add_document(&self, doc: SearchDocument) -> Result<(), crate::Error> {
        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        let schema = guard
            .schema
            .clone()
            .ok_or(crate::Error::IndexNotInitialized)?;
        let writer = guard
            .writer
            .as_mut()
            .ok_or(crate::Error::IndexNotInitialized)?;

        let fields = get_fields(&schema);
        let tantivy_doc = create_tantivy_document(&schema, &fields, &doc)?;

        writer.add_document(tantivy_doc)?;
        Ok(())
    }

    pub async fn update_document(&self, doc: SearchDocument) -> Result<(), crate::Error> {
        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        let schema = guard
            .schema
            .clone()
            .ok_or(crate::Error::IndexNotInitialized)?;
        let writer = guard
            .writer
            .as_mut()
            .ok_or(crate::Error::IndexNotInitialized)?;

        let fields = get_fields(&schema);
        let id_term = Term::from_field_text(fields.id, &doc.id);

        writer.delete_term(id_term);

        let tantivy_doc = create_tantivy_document(&schema, &fields, &doc)?;
        writer.add_document(tantivy_doc)?;
        Ok(())
    }

    pub async fn delete_document(&self, id: String) -> Result<(), crate::Error> {
        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        let schema = guard
            .schema
            .clone()
            .ok_or(crate::Error::IndexNotInitialized)?;
        let writer = guard
            .writer
            .as_mut()
            .ok_or(crate::Error::IndexNotInitialized)?;

        let fields = get_fields(&schema);
        let id_term = Term::from_field_text(fields.id, &id);

        writer.delete_term(id_term);
        Ok(())
    }

    pub async fn commit(&self) -> Result<(), crate::Error> {
        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        let writer = guard
            .writer
            .as_mut()
            .ok_or(crate::Error::IndexNotInitialized)?;
        writer.commit()?;
        Ok(())
    }

    pub async fn search(
        &self,
        query: String,
        filters: Option<SearchFilters>,
        limit: usize,
    ) -> Result<SearchResult, crate::Error> {
        let state = self.manager.state::<IndexState>();
        let guard = state.inner.lock().await;

        let schema = guard
            .schema
            .as_ref()
            .ok_or(crate::Error::IndexNotInitialized)?;
        let index = guard
            .index
            .as_ref()
            .ok_or(crate::Error::IndexNotInitialized)?;
        let reader = guard
            .reader
            .as_ref()
            .ok_or(crate::Error::IndexNotInitialized)?;

        let fields = get_fields(schema);
        let searcher = reader.searcher();

        let query_parser = QueryParser::for_index(index, vec![fields.title, fields.content]);
        let mut parsed_query = query_parser.parse_query(&query)?;

        if let Some(ref filter) = filters {
            if let Some(ref created_at_filter) = filter.created_at {
                let range_query =
                    build_created_at_range_query(fields.created_at, created_at_filter);
                if let Some(rq) = range_query {
                    parsed_query = Box::new(BooleanQuery::new(vec![
                        (Occur::Must, parsed_query),
                        (Occur::Must, rq),
                    ]));
                }
            }
        }

        let top_docs = searcher.search(&parsed_query, &TopDocs::with_limit(limit))?;

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

    pub async fn search_fuzzy(
        &self,
        query: String,
        filters: Option<SearchFilters>,
        limit: usize,
        distance: u8,
    ) -> Result<SearchResult, crate::Error> {
        let state = self.manager.state::<IndexState>();
        let guard = state.inner.lock().await;

        let schema = guard
            .schema
            .as_ref()
            .ok_or(crate::Error::IndexNotInitialized)?;
        let reader = guard
            .reader
            .as_ref()
            .ok_or(crate::Error::IndexNotInitialized)?;

        let fields = get_fields(schema);
        let searcher = reader.searcher();

        let terms: Vec<&str> = query.split_whitespace().collect();
        let mut subqueries: Vec<(Occur, Box<dyn Query>)> = Vec::new();

        for term in terms {
            let title_fuzzy =
                FuzzyTermQuery::new(Term::from_field_text(fields.title, term), distance, true);
            let content_fuzzy =
                FuzzyTermQuery::new(Term::from_field_text(fields.content, term), distance, true);

            subqueries.push((Occur::Should, Box::new(title_fuzzy)));
            subqueries.push((Occur::Should, Box::new(content_fuzzy)));
        }

        let mut combined_query: Box<dyn Query> = Box::new(BooleanQuery::new(subqueries));

        if let Some(ref filter) = filters {
            if let Some(ref created_at_filter) = filter.created_at {
                let range_query =
                    build_created_at_range_query(fields.created_at, created_at_filter);
                if let Some(rq) = range_query {
                    combined_query = Box::new(BooleanQuery::new(vec![
                        (Occur::Must, combined_query),
                        (Occur::Must, rq),
                    ]));
                }
            }
        }

        let top_docs = searcher.search(&combined_query, &TopDocs::with_limit(limit))?;

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

    pub async fn clear(&self) -> Result<(), crate::Error> {
        let state = self.manager.state::<IndexState>();
        let mut guard = state.inner.lock().await;

        let writer = guard
            .writer
            .as_mut()
            .ok_or(crate::Error::IndexNotInitialized)?;
        writer.delete_all_documents()?;
        writer.commit()?;
        Ok(())
    }

    pub async fn count(&self) -> Result<u64, crate::Error> {
        let state = self.manager.state::<IndexState>();
        let guard = state.inner.lock().await;

        let reader = guard
            .reader
            .as_ref()
            .ok_or(crate::Error::IndexNotInitialized)?;
        let searcher = reader.searcher();

        Ok(searcher.num_docs())
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

fn build_schema() -> Schema {
    let mut schema_builder = Schema::builder();
    schema_builder.add_text_field("id", STRING | STORED);
    schema_builder.add_text_field("doc_type", STRING | STORED);
    schema_builder.add_text_field("title", TEXT | STORED);
    schema_builder.add_text_field("content", TEXT | STORED);
    schema_builder.add_i64_field("created_at", FAST | STORED);
    schema_builder.build()
}

struct SchemaFields {
    id: Field,
    doc_type: Field,
    title: Field,
    content: Field,
    created_at: Field,
}

fn get_fields(schema: &Schema) -> SchemaFields {
    SchemaFields {
        id: schema.get_field("id").unwrap(),
        doc_type: schema.get_field("doc_type").unwrap(),
        title: schema.get_field("title").unwrap(),
        content: schema.get_field("content").unwrap(),
        created_at: schema.get_field("created_at").unwrap(),
    }
}

fn create_tantivy_document(
    _schema: &Schema,
    fields: &SchemaFields,
    doc: &SearchDocument,
) -> Result<TantivyDocument, crate::Error> {
    let mut tantivy_doc = TantivyDocument::new();
    tantivy_doc.add_text(fields.id, &doc.id);
    tantivy_doc.add_text(fields.doc_type, &doc.doc_type);
    tantivy_doc.add_text(fields.title, &doc.title);
    tantivy_doc.add_text(fields.content, &doc.content);
    tantivy_doc.add_i64(fields.created_at, doc.created_at);
    Ok(tantivy_doc)
}

fn extract_search_document(
    _schema: &Schema,
    fields: &SchemaFields,
    doc: &TantivyDocument,
) -> Option<SearchDocument> {
    let id = doc.get_first(fields.id)?.as_str()?.to_string();
    let doc_type = doc.get_first(fields.doc_type)?.as_str()?.to_string();
    let title = doc.get_first(fields.title)?.as_str()?.to_string();
    let content = doc.get_first(fields.content)?.as_str()?.to_string();
    let created_at = doc.get_first(fields.created_at)?.as_i64()?;

    Some(SearchDocument {
        id,
        doc_type,
        title,
        content,
        created_at,
    })
}

fn build_created_at_range_query(
    _field: Field,
    filter: &crate::CreatedAtFilter,
) -> Option<Box<dyn Query>> {
    let lower = filter.gte.or(filter.gt.map(|v| v.saturating_add(1))).unwrap_or(i64::MIN);
    let upper = filter.lte.or(filter.lt.map(|v| v.saturating_sub(1))).unwrap_or(i64::MAX);

    if let Some(eq) = filter.eq {
        Some(Box::new(RangeQuery::new_i64(
            "created_at".to_string(),
            eq..(eq + 1),
        )))
    } else if lower != i64::MIN || upper != i64::MAX {
        Some(Box::new(RangeQuery::new_i64(
            "created_at".to_string(),
            lower..(upper.saturating_add(1)),
        )))
    } else {
        None
    }
}
