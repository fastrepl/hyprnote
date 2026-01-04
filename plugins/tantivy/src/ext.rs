use tantivy::collector::TopDocs;
use tantivy::query::{BooleanQuery, FuzzyTermQuery, Occur, Query, QueryParser, RangeQuery};
use tantivy::schema::{FAST, Field, STORED, STRING, Schema, TextFieldIndexing, TextOptions, Value};
use tantivy::tokenizer::{
    Language, LowerCaser, RemoveLongFilter, SimpleTokenizer, Stemmer, TextAnalyzer,
};
use tantivy::{Index, ReloadPolicy, TantivyDocument, Term};
use tauri_plugin_path2::Path2PluginExt;

use crate::{
    CollectionConfig, CollectionIndex, IndexState, SearchDocument, SearchFilters, SearchHit,
    SearchOptions, SearchResult,
};

pub fn detect_language(text: &str) -> hypr_language::Language {
    hypr_language::detect(text)
}

pub fn get_tokenizer_name_for_language(lang: &hypr_language::Language) -> &'static str {
    if let Some(tantivy_lang) = lang.for_tantivy_stemmer() {
        match tantivy_lang {
            Language::Arabic => "lang_ar",
            Language::Danish => "lang_da",
            Language::Dutch => "lang_nl",
            Language::English => "lang_en",
            Language::Finnish => "lang_fi",
            Language::French => "lang_fr",
            Language::German => "lang_de",
            Language::Greek => "lang_el",
            Language::Hungarian => "lang_hu",
            Language::Italian => "lang_it",
            Language::Norwegian => "lang_no",
            Language::Portuguese => "lang_pt",
            Language::Romanian => "lang_ro",
            Language::Russian => "lang_ru",
            Language::Spanish => "lang_es",
            Language::Swedish => "lang_sv",
            Language::Tamil => "lang_ta",
            Language::Turkish => "lang_tr",
        }
    } else {
        "multilang"
    }
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

    pub async fn search(
        &self,
        collection: Option<String>,
        query: String,
        filters: Option<SearchFilters>,
        limit: usize,
        options: Option<SearchOptions>,
    ) -> Result<SearchResult, crate::Error> {
        let collection_name = Self::get_collection_name(collection);
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

        let options = options.unwrap_or_default();
        let use_fuzzy = options.fuzzy.unwrap_or(false);

        let mut combined_query: Box<dyn Query> = if use_fuzzy {
            let distance = options.distance.unwrap_or(1);
            let terms: Vec<&str> = query.split_whitespace().collect();
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
            query_parser.parse_query(&query)?
        };

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

fn register_tokenizers(index: &Index) {
    let tokenizer_manager = index.tokenizers();

    let multilang_tokenizer = TextAnalyzer::builder(SimpleTokenizer::default())
        .filter(RemoveLongFilter::limit(40))
        .filter(LowerCaser)
        .build();
    tokenizer_manager.register("multilang", multilang_tokenizer);

    let languages = [
        ("lang_ar", Language::Arabic),
        ("lang_da", Language::Danish),
        ("lang_nl", Language::Dutch),
        ("lang_en", Language::English),
        ("lang_fi", Language::Finnish),
        ("lang_fr", Language::French),
        ("lang_de", Language::German),
        ("lang_el", Language::Greek),
        ("lang_hu", Language::Hungarian),
        ("lang_it", Language::Italian),
        ("lang_no", Language::Norwegian),
        ("lang_pt", Language::Portuguese),
        ("lang_ro", Language::Romanian),
        ("lang_ru", Language::Russian),
        ("lang_es", Language::Spanish),
        ("lang_sv", Language::Swedish),
        ("lang_ta", Language::Tamil),
        ("lang_tr", Language::Turkish),
    ];

    for (name, lang) in languages {
        let tokenizer = TextAnalyzer::builder(SimpleTokenizer::default())
            .filter(RemoveLongFilter::limit(40))
            .filter(LowerCaser)
            .filter(Stemmer::new(lang))
            .build();
        tokenizer_manager.register(name, tokenizer);
    }
}

struct SchemaFields {
    id: Field,
    doc_type: Field,
    language: Field,
    title: Field,
    content: Field,
    created_at: Field,
}

fn get_fields(schema: &Schema) -> SchemaFields {
    SchemaFields {
        id: schema.get_field("id").unwrap(),
        doc_type: schema.get_field("doc_type").unwrap(),
        language: schema.get_field("language").unwrap(),
        title: schema.get_field("title").unwrap(),
        content: schema.get_field("content").unwrap(),
        created_at: schema.get_field("created_at").unwrap(),
    }
}

fn extract_search_document(
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

fn build_created_at_range_query(
    _field: Field,
    filter: &crate::CreatedAtFilter,
) -> Option<Box<dyn Query>> {
    let lower = filter
        .gte
        .or(filter.gt.map(|v| v.saturating_add(1)))
        .unwrap_or(i64::MIN);
    let upper = filter
        .lte
        .or(filter.lt.map(|v| v.saturating_sub(1)))
        .unwrap_or(i64::MAX);

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

#[cfg(test)]
mod tests {
    use super::*;
    use hypr_language::ISO639;

    #[test]
    fn test_detect_language_english() {
        let text = "The quick brown fox jumps over the lazy dog. This is a longer sentence to ensure accurate language detection.";
        let lang = detect_language(text);
        assert_eq!(lang.iso639(), ISO639::En);
    }

    #[test]
    fn test_detect_language_spanish() {
        let text = "El rápido zorro marrón salta sobre el perro perezoso. Esta es una oración más larga para asegurar una detección precisa del idioma.";
        let lang = detect_language(text);
        assert_eq!(lang.iso639(), ISO639::Es);
    }

    #[test]
    fn test_detect_language_french() {
        let text = "Le rapide renard brun saute par-dessus le chien paresseux. Ceci est une phrase plus longue pour assurer une détection précise de la langue.";
        let lang = detect_language(text);
        assert_eq!(lang.iso639(), ISO639::Fr);
    }

    #[test]
    fn test_detect_language_german() {
        let text = "Der schnelle braune Fuchs springt über den faulen Hund. Dies ist ein längerer Satz, um eine genaue Spracherkennung zu gewährleisten.";
        let lang = detect_language(text);
        assert_eq!(lang.iso639(), ISO639::De);
    }

    #[test]
    fn test_detect_language_chinese() {
        let text = "快速的棕色狐狸跳过懒狗。这是一个较长的句子，以确保准确的语言检测。";
        let lang = detect_language(text);
        assert_eq!(lang.iso639(), ISO639::Zh);
    }

    #[test]
    fn test_detect_language_japanese() {
        let text = "素早い茶色のキツネが怠惰な犬を飛び越えます。これは正確な言語検出を確保するための長い文です。";
        let lang = detect_language(text);
        assert_eq!(lang.iso639(), ISO639::Ja);
    }

    #[test]
    fn test_get_tokenizer_name_for_supported_languages() {
        let test_cases = [
            (ISO639::Ar, "lang_ar"),
            (ISO639::Da, "lang_da"),
            (ISO639::Nl, "lang_nl"),
            (ISO639::En, "lang_en"),
            (ISO639::Fi, "lang_fi"),
            (ISO639::Fr, "lang_fr"),
            (ISO639::De, "lang_de"),
            (ISO639::El, "lang_el"),
            (ISO639::Hu, "lang_hu"),
            (ISO639::It, "lang_it"),
            (ISO639::No, "lang_no"),
            (ISO639::Pt, "lang_pt"),
            (ISO639::Ro, "lang_ro"),
            (ISO639::Ru, "lang_ru"),
            (ISO639::Es, "lang_es"),
            (ISO639::Sv, "lang_sv"),
            (ISO639::Ta, "lang_ta"),
            (ISO639::Tr, "lang_tr"),
        ];

        for (iso639, expected_tokenizer) in test_cases {
            let lang = hypr_language::Language::from(iso639);
            let tokenizer_name = get_tokenizer_name_for_language(&lang);
            assert_eq!(
                tokenizer_name, expected_tokenizer,
                "Expected tokenizer {} for {:?}, got {}",
                expected_tokenizer, iso639, tokenizer_name
            );
        }
    }

    #[test]
    fn test_get_tokenizer_name_for_unsupported_languages() {
        let unsupported = [ISO639::Zh, ISO639::Ja, ISO639::Ko, ISO639::Hi, ISO639::Vi];

        for iso639 in unsupported {
            let lang = hypr_language::Language::from(iso639);
            let tokenizer_name = get_tokenizer_name_for_language(&lang);
            assert_eq!(
                tokenizer_name, "multilang",
                "Expected multilang tokenizer for {:?}, got {}",
                iso639, tokenizer_name
            );
        }
    }

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

    #[test]
    fn test_register_tokenizers() {
        let schema = build_schema();
        let index = Index::create_in_ram(schema);
        register_tokenizers(&index);

        let tokenizer_manager = index.tokenizers();

        assert!(
            tokenizer_manager.get("multilang").is_some(),
            "multilang tokenizer should be registered"
        );
        assert!(
            tokenizer_manager.get("lang_en").is_some(),
            "lang_en tokenizer should be registered"
        );
        assert!(
            tokenizer_manager.get("lang_es").is_some(),
            "lang_es tokenizer should be registered"
        );
        assert!(
            tokenizer_manager.get("lang_fr").is_some(),
            "lang_fr tokenizer should be registered"
        );
        assert!(
            tokenizer_manager.get("lang_de").is_some(),
            "lang_de tokenizer should be registered"
        );
    }

    #[test]
    fn test_english_stemmer_tokenizer() {
        let schema = build_schema();
        let index = Index::create_in_ram(schema);
        register_tokenizers(&index);

        let tokenizer_manager = index.tokenizers();
        let mut tokenizer = tokenizer_manager.get("lang_en").unwrap();

        let mut stream = tokenizer.token_stream("running jumps quickly");
        let mut tokens = Vec::new();
        while let Some(token) = stream.next() {
            tokens.push(token.text.clone());
        }

        assert!(
            tokens.contains(&"run".to_string()),
            "English stemmer should stem 'running' to 'run', got {:?}",
            tokens
        );
        assert!(
            tokens.contains(&"jump".to_string()),
            "English stemmer should stem 'jumps' to 'jump', got {:?}",
            tokens
        );
        assert!(
            tokens.contains(&"quick".to_string()),
            "English stemmer should stem 'quickly' to 'quick', got {:?}",
            tokens
        );
    }
}
