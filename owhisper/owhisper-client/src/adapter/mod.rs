mod argmax;
mod deepgram;
mod owhisper;
mod soniox;

pub use argmax::*;
pub use deepgram::*;
pub use soniox::*;

use std::future::Future;
use std::path::Path;
use std::pin::Pin;

use hypr_ws::client::Message;
use owhisper_interface::batch::Response as BatchResponse;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::ListenParams;

use crate::error::Error;

pub type BatchFuture<'a> = Pin<Box<dyn Future<Output = Result<BatchResponse, Error>> + Send + 'a>>;

pub trait RealtimeSttAdapter: Clone + Default + Send + Sync + 'static {
    fn supports_native_multichannel(&self) -> bool;

    fn build_ws_url(&self, api_base: &str, params: &ListenParams, channels: u8) -> url::Url;

    fn build_auth_header(&self, api_key: Option<&str>) -> Option<(&'static str, String)>;

    fn keep_alive_message(&self) -> Option<Message>;

    fn finalize_message(&self) -> Message;

    fn initial_message(
        &self,
        _api_key: Option<&str>,
        _params: &ListenParams,
        _channels: u8,
    ) -> Option<Message> {
        None
    }

    fn parse_response(&self, raw: &str) -> Option<StreamResponse>;
}

pub trait BatchSttAdapter: Clone + Default + Send + Sync + 'static {
    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a reqwest::Client,
        api_base: &'a str,
        api_key: &'a str,
        params: &'a ListenParams,
        file_path: P,
    ) -> BatchFuture<'a>;
}
