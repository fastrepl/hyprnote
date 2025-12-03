use owhisper_interface::ListenParams;
use url::form_urlencoded::Serializer;
use url::UrlQuery;

pub trait LanguageQueryStrategy {
    fn append_language_query<'a>(
        &self,
        query_pairs: &mut Serializer<'a, UrlQuery>,
        params: &ListenParams,
    );
}
