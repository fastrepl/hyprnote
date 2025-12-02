use std::marker::PhantomData;
use std::path::Path;

use owhisper_interface::batch::Response as BatchResponse;
use owhisper_interface::ListenParams;

use crate::adapter::BatchSttAdapter;
use crate::error::Error;
use crate::DeepgramAdapter;

#[derive(Clone)]
pub struct BatchClient<A: BatchSttAdapter = DeepgramAdapter> {
    client: reqwest::Client,
    api_base: String,
    api_key: String,
    params: ListenParams,
    _marker: PhantomData<A>,
}

impl<A: BatchSttAdapter> BatchClient<A> {
    pub fn new(api_base: String, api_key: String, params: ListenParams) -> Self {
        Self {
            client: reqwest::Client::new(),
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
