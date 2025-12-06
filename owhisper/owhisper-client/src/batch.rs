use std::marker::PhantomData;
use std::path::Path;

use owhisper_interface::batch::Response as BatchResponse;
use owhisper_interface::ListenParams;
use reqwest_middleware::ClientWithMiddleware;

use crate::adapter::BatchSttAdapter;
use crate::error::Error;
use crate::http_client::create_client;
use crate::DeepgramAdapter;

pub struct BatchClientBuilder<A: BatchSttAdapter = DeepgramAdapter> {
    api_base: Option<String>,
    api_key: Option<String>,
    params: Option<ListenParams>,
    _marker: PhantomData<A>,
}

impl Default for BatchClientBuilder {
    fn default() -> Self {
        Self {
            api_base: None,
            api_key: None,
            params: None,
            _marker: PhantomData,
        }
    }
}

impl<A: BatchSttAdapter> BatchClientBuilder<A> {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn params(mut self, params: ListenParams) -> Self {
        self.params = Some(params);
        self
    }

    pub fn adapter<B: BatchSttAdapter>(self) -> BatchClientBuilder<B> {
        BatchClientBuilder {
            api_base: self.api_base,
            api_key: self.api_key,
            params: self.params,
            _marker: PhantomData,
        }
    }

    pub fn build(self) -> BatchClient<A> {
        BatchClient::new(
            self.api_base.expect("api_base is required"),
            self.api_key.unwrap_or_default(),
            self.params.unwrap_or_default(),
        )
    }
}

#[derive(Clone)]
pub struct BatchClient<A: BatchSttAdapter = DeepgramAdapter> {
    client: ClientWithMiddleware,
    api_base: String,
    api_key: String,
    params: ListenParams,
    _marker: PhantomData<A>,
}

impl<A: BatchSttAdapter> BatchClient<A> {
    pub fn builder() -> BatchClientBuilder<A> {
        BatchClientBuilder {
            api_base: None,
            api_key: None,
            params: None,
            _marker: PhantomData,
        }
    }

    pub fn new(api_base: String, api_key: String, params: ListenParams) -> Self {
        Self {
            client: create_client(),
            api_base,
            api_key,
            params,
            _marker: PhantomData,
        }
    }

    pub async fn transcribe_file<P: AsRef<Path> + Send>(
        &self,
        file_path: P,
    ) -> Result<BatchResponse, Error> {
        let adapter = A::default();
        adapter
            .transcribe_file(
                &self.client,
                &self.api_base,
                &self.api_key,
                &self.params,
                file_path,
            )
            .await
    }
}
