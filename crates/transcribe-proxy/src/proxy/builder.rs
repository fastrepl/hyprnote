use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;

pub use tokio_tungstenite::tungstenite::ClientRequestBuilder;

use super::handler::WebSocketProxy;
use super::types::{FirstMessageTransformer, OnCloseCallback, UPSTREAM_CONNECT_TIMEOUT_MS};

pub struct WebSocketProxyBuilder {
    url: Option<String>,
    headers: HashMap<String, String>,
    request: Option<ClientRequestBuilder>,
    control_message_types: HashSet<&'static str>,
    transform_first_message: Option<FirstMessageTransformer>,
    connect_timeout: Duration,
    on_close: Option<OnCloseCallback>,
}

impl Default for WebSocketProxyBuilder {
    fn default() -> Self {
        Self {
            url: None,
            headers: HashMap::new(),
            request: None,
            control_message_types: HashSet::new(),
            transform_first_message: None,
            connect_timeout: Duration::from_millis(UPSTREAM_CONNECT_TIMEOUT_MS),
            on_close: None,
        }
    }
}

impl WebSocketProxyBuilder {
    pub fn upstream_url(mut self, url: impl Into<String>) -> Self {
        self.url = Some(url.into());
        self
    }

    pub fn header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.insert(key.into(), value.into());
        self
    }

    pub fn headers(mut self, headers: HashMap<String, String>) -> Self {
        self.headers.extend(headers);
        self
    }

    pub fn upstream_request(mut self, request: ClientRequestBuilder) -> Self {
        self.request = Some(request);
        self
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

    pub fn on_close<F>(mut self, callback: F) -> Self
    where
        F: Fn(Duration) + Send + Sync + 'static,
    {
        self.on_close = Some(Arc::new(callback));
        self
    }

    pub fn build(self) -> WebSocketProxy {
        let control_message_types = if self.control_message_types.is_empty() {
            None
        } else {
            Some(Arc::new(self.control_message_types))
        };

        let upstream_request = if let Some(request) = self.request {
            request
        } else {
            let url = self.url.expect("upstream_url is required");
            let mut request = ClientRequestBuilder::new(url.parse().expect("invalid upstream URL"));
            for (key, value) in self.headers {
                request = request.with_header(&key, &value);
            }
            request
        };

        WebSocketProxy::new(
            upstream_request,
            control_message_types,
            self.transform_first_message,
            self.connect_timeout,
            self.on_close,
        )
    }
}
