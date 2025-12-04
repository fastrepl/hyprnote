mod adapter;
mod batch;
mod error;
mod live;
pub(crate) mod polling;

#[cfg(test)]
pub(crate) mod test_utils;

use std::marker::PhantomData;

pub use adapter::{
    append_provider_param, is_local_host, AdapterKind, ArgmaxAdapter, AssemblyAIAdapter,
    BatchSttAdapter, DeepgramAdapter, FireworksAdapter, GladiaAdapter, RealtimeSttAdapter,
    SonioxAdapter,
};
pub use batch::BatchClient;
pub use error::Error;
pub use hypr_ws;
pub use live::{DualHandle, FinalizeHandle, ListenClient, ListenClientDual};

pub struct ListenClientBuilder<A: RealtimeSttAdapter = DeepgramAdapter> {
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

impl<A: RealtimeSttAdapter> ListenClientBuilder<A> {
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

    pub fn adapter<B: RealtimeSttAdapter>(self) -> ListenClientBuilder<B> {
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
        let api_base = append_provider_param(self.get_api_base(), adapter.provider_name());
        let url = adapter
            .build_ws_url_with_api_key(&api_base, &params, channels, self.api_key.as_deref())
            .unwrap_or_else(|| adapter.build_ws_url(&api_base, &params, channels));
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

impl<A: RealtimeSttAdapter + BatchSttAdapter> ListenClientBuilder<A> {
    pub fn build_batch(self) -> BatchClient<A> {
        let params = self.get_params();
        let api_base = self.get_api_base().to_string();
        BatchClient::new(api_base, self.api_key.unwrap_or_default(), params)
    }
}
