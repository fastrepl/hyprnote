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
        let max_keywords = if use_keyterms {
            // https://github.com/deepgram/deepgram-python-sdk/issues/503
            50
        } else {
            // https://developers.deepgram.com/docs/keywords#keyword-limits
            99
        };

        for keyword in params.keywords.iter().take(max_keywords) {
            query_pairs.append_pair(param_name, keyword);
        }
    }
}
