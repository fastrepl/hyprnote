use owhisper_interface::ListenParams;

use crate::adapter::deepgram_compat::{KeywordQueryStrategy, Serializer, UrlQuery};

pub struct DeepgramKeywordStrategy;

impl KeywordQueryStrategy for DeepgramKeywordStrategy {
    fn append_keyword_query<'a>(
        &self,
        query_pairs: &mut Serializer<'a, UrlQuery>,
        params: &ListenParams,
    ) {
        if params.keywords.is_empty() {
            return;
        }

        let use_keyterms = params
            .model
            .as_ref()
            .map(|model| model.contains("nova-3"))
            .unwrap_or(false);

        let param_name = if use_keyterms { "keyterm" } else { "keywords" };

        for keyword in &params.keywords {
            query_pairs.append_pair(param_name, keyword);
        }
    }
}
