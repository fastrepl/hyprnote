use owhisper_interface::ListenParams;
use url::form_urlencoded::Serializer;
use url::UrlQuery;

pub trait KeywordQueryStrategy {
    fn append_keyword_query<'a>(
        &self,
        query_pairs: &mut Serializer<'a, UrlQuery>,
        params: &ListenParams,
    );
}
