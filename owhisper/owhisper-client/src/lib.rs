mod adapter;
mod batch;
mod error;
mod live;

use std::marker::PhantomData;

use url::form_urlencoded::Serializer;
use url::UrlQuery;

pub use adapter::{ArgmaxAdapter, DeepgramAdapter, SonioxAdapter, SttAdapter};
pub use batch::BatchClient;
pub use error::Error;
pub use hypr_ws;
pub use live::{DualHandle, FinalizeHandle, ListenClient, ListenClientDual};

pub struct ListenClientBuilder<A: SttAdapter = DeepgramAdapter> {
    api_base: Option<String>,
    api_key: Option<String>,
    params: Option<owhisper_interface::ListenParams>,
    _marker: PhantomData<A>,
}

impl Default for ListenClientBuilder {
    fn default() -> Self {
        Self {
            api_base: None,
            api_key: None,
            params: None,
            _marker: PhantomData,
        }
    }
}

impl<A: SttAdapter> ListenClientBuilder<A> {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn params(mut self, params: owhisper_interface::ListenParams) -> Self {
        self.params = Some(params);
        self
    }

    pub fn adapter<B: SttAdapter>(self) -> ListenClientBuilder<B> {
        ListenClientBuilder {
            api_base: self.api_base,
            api_key: self.api_key,
            params: self.params,
            _marker: PhantomData,
        }
    }

    fn get_api_base(&self) -> &str {
        self.api_base.as_ref().expect("api_base is required")
    }

    fn get_params(&self) -> owhisper_interface::ListenParams {
        self.params.clone().unwrap_or_default()
    }

    fn build_request(&self, adapter: &A, channels: u8) -> hypr_ws::client::ClientRequestBuilder {
        let params = self.get_params();
        let url = adapter.build_ws_url(self.get_api_base(), &params, channels);
        let uri = url.to_string().parse().unwrap();

        let mut request = hypr_ws::client::ClientRequestBuilder::new(uri);

        if let Some((header_name, header_value)) =
            adapter.build_auth_header(self.api_key.as_deref())
        {
            request = request.with_header(header_name, header_value);
        }

        request
    }

    pub fn build_with_channels(self, channels: u8) -> ListenClient<A> {
        let adapter = A::default();
        let params = self.get_params();
        let request = self.build_request(&adapter, channels);
        let initial_message = adapter.initial_message(self.api_key.as_deref(), &params, channels);

        ListenClient {
            adapter,
            request,
            initial_message,
        }
    }

    pub fn build_batch(self) -> BatchClient<A> {
        let params = self.get_params();
        let api_base = self.get_api_base().to_string();
        BatchClient::new(api_base, self.api_key.unwrap_or_default(), params)
    }

    pub fn build_single(self) -> ListenClient<A> {
        self.build_with_channels(1)
    }

    pub fn build_dual(self) -> ListenClientDual<A> {
        let adapter = A::default();
        let channels = if adapter.supports_native_multichannel() {
            2
        } else {
            1
        };
        let params = self.get_params();
        let request = self.build_request(&adapter, channels);
        let initial_message = adapter.initial_message(self.api_key.as_deref(), &params, channels);

        ListenClientDual {
            adapter,
            request,
            initial_message,
        }
    }
}

pub(crate) fn append_language_query<'a>(
    query_pairs: &mut Serializer<'a, UrlQuery>,
    params: &owhisper_interface::ListenParams,
) {
    let model = params.model.as_deref().unwrap_or("");
    let supports_multi = model.starts_with("nova-2") || model.starts_with("nova-3");

    match params.languages.len() {
        0 => {
            query_pairs.append_pair("detect_language", "true");
        }
        1 => {
            if let Some(language) = params.languages.first() {
                let code = language.iso639().code();
                query_pairs.append_pair("language", code);
                query_pairs.append_pair("languages", code);
            }
        }
        _ => {
            if supports_multi {
                query_pairs.append_pair("language", "multi");
                for language in &params.languages {
                    let code = language.iso639().code();
                    query_pairs.append_pair("languages", code);
                }
            } else {
                query_pairs.append_pair("detect_language", "true");
                for language in &params.languages {
                    let code = language.iso639().code();
                    query_pairs.append_pair("languages", code);
                }
            }
        }
    }
}

pub(crate) fn append_keyword_query<'a>(
    query_pairs: &mut Serializer<'a, UrlQuery>,
    params: &owhisper_interface::ListenParams,
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
