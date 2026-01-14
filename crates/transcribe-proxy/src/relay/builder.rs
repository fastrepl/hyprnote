use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;

use owhisper_providers::Auth;
pub use tokio_tungstenite::tungstenite::ClientRequestBuilder;

use super::handler::WebSocketProxy;
use super::params::transform_client_params;
use super::types::{FirstMessageTransformer, OnCloseCallback};
use crate::config::DEFAULT_CONNECT_TIMEOUT_MS;
use crate::provider_selector::SelectedProvider;
use crate::query_params::QueryParams;
use crate::upstream_url::UpstreamUrlBuilder;

pub struct NoUpstream;
pub struct WithUrl {
    url: String,
    headers: HashMap<String, String>,
}
pub struct WithUrlComponents {
    base_url: url::Url,
    client_params: QueryParams,
    default_params: Vec<(&'static str, &'static str)>,
    headers: HashMap<String, String>,
}

pub struct WebSocketProxyBuilder<S = NoUpstream> {
    state: S,
    control_message_types: HashSet<&'static str>,
    transform_first_message: Option<FirstMessageTransformer>,
    connect_timeout: Duration,
    on_close: Option<OnCloseCallback>,
}

impl Default for WebSocketProxyBuilder<NoUpstream> {
    fn default() -> Self {
        Self {
            state: NoUpstream,
            control_message_types: HashSet::new(),
            transform_first_message: None,
            connect_timeout: Duration::from_millis(DEFAULT_CONNECT_TIMEOUT_MS),
            on_close: None,
        }
    }
}

impl<S> WebSocketProxyBuilder<S> {
    fn with_state<T>(self, state: T) -> WebSocketProxyBuilder<T> {
        WebSocketProxyBuilder {
            state,
            control_message_types: self.control_message_types,
            transform_first_message: self.transform_first_message,
            connect_timeout: self.connect_timeout,
            on_close: self.on_close,
        }
    }

    fn build_from(
        request: ClientRequestBuilder,
        control_message_types: HashSet<&'static str>,
        transform_first_message: Option<FirstMessageTransformer>,
        connect_timeout: Duration,
        on_close: Option<OnCloseCallback>,
    ) -> WebSocketProxy {
        let control_message_types = if control_message_types.is_empty() {
            None
        } else {
            Some(Arc::new(control_message_types))
        };

        WebSocketProxy::new(
            request,
            control_message_types,
            transform_first_message,
            connect_timeout,
            on_close,
        )
    }

    pub fn control_message_types(mut self, types: &[&'static str]) -> Self {
        self.control_message_types = types.iter().copied().collect();
        self
    }

    pub fn transform_first_message<F>(mut self, transformer: F) -> Self
    where
        F: Fn(String) -> String + Send + Sync + 'static,
    {
        self.transform_first_message = Some(Arc::new(transformer));
        self
    }

    pub fn connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = timeout;
        self
    }

    pub fn on_close<F, Fut>(mut self, callback: F) -> Self
    where
        F: Fn(Duration) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = ()> + Send + 'static,
    {
        self.on_close = Some(Arc::new(move |duration| {
            Box::pin(callback(duration))
                as std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>>
        }));
        self
    }
}

impl WebSocketProxyBuilder<NoUpstream> {
    pub fn upstream_url(self, url: impl Into<String>) -> WebSocketProxyBuilder<WithUrl> {
        self.with_state(WithUrl {
            url: url.into(),
            headers: HashMap::new(),
        })
    }

    pub fn upstream_url_from_components(
        self,
        base_url: url::Url,
        mut client_params: QueryParams,
        default_params: &'static [(&'static str, &'static str)],
    ) -> WebSocketProxyBuilder<WithUrlComponents> {
        transform_client_params(&mut client_params);
        self.with_state(WithUrlComponents {
            base_url,
            client_params,
            default_params: default_params.to_vec(),
            headers: HashMap::new(),
        })
    }
}

impl WebSocketProxyBuilder<WithUrl> {
    pub fn header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.state.headers.insert(key.into(), value.into());
        self
    }

    pub fn headers(mut self, new_headers: HashMap<String, String>) -> Self {
        self.state.headers.extend(new_headers);
        self
    }

    pub fn apply_auth(self, selected: &SelectedProvider) -> Self {
        let provider = selected.provider();
        let api_key = selected.api_key();

        match provider.auth() {
            Auth::Header { .. } => match provider.build_auth_header(api_key) {
                Some((name, value)) => self.header(name, value),
                None => self,
            },
            Auth::FirstMessage { .. } => {
                let auth = provider.auth();
                let api_key = api_key.to_string();
                self.transform_first_message(move |msg| auth.transform_first_message(msg, &api_key))
            }
            Auth::SessionInit { .. } => self,
        }
    }

    pub fn build(self) -> Result<WebSocketProxy, crate::ProxyError> {
        let uri = self
            .state
            .url
            .parse()
            .map_err(|e| crate::ProxyError::InvalidRequest(format!("{}", e)))?;

        let mut request = ClientRequestBuilder::new(uri);
        for (key, value) in self.state.headers {
            request = request.with_header(&key, &value);
        }

        Ok(Self::build_from(
            request,
            self.control_message_types,
            self.transform_first_message,
            self.connect_timeout,
            self.on_close,
        ))
    }
}

impl WebSocketProxyBuilder<WithUrlComponents> {
    pub fn header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.state.headers.insert(key.into(), value.into());
        self
    }

    pub fn headers(mut self, new_headers: HashMap<String, String>) -> Self {
        self.state.headers.extend(new_headers);
        self
    }

    pub fn apply_auth(self, selected: &SelectedProvider) -> Self {
        let provider = selected.provider();
        let api_key = selected.api_key();

        match provider.auth() {
            Auth::Header { .. } => match provider.build_auth_header(api_key) {
                Some((name, value)) => self.header(name, value),
                None => self,
            },
            Auth::FirstMessage { .. } => {
                let auth = provider.auth();
                let api_key = api_key.to_string();
                self.transform_first_message(move |msg| auth.transform_first_message(msg, &api_key))
            }
            Auth::SessionInit { .. } => self,
        }
    }

    pub fn build(self) -> Result<WebSocketProxy, crate::ProxyError> {
        let url = UpstreamUrlBuilder::new(self.state.base_url)
            .default_params(&self.state.default_params)
            .client_params(&self.state.client_params)
            .build();

        let uri = url
            .as_str()
            .parse()
            .map_err(|e| crate::ProxyError::InvalidRequest(format!("{}", e)))?;

        let mut request = ClientRequestBuilder::new(uri);
        for (key, value) in self.state.headers {
            request = request.with_header(&key, &value);
        }

        Ok(Self::build_from(
            request,
            self.control_message_types,
            self.transform_first_message,
            self.connect_timeout,
            self.on_close,
        ))
    }
}
