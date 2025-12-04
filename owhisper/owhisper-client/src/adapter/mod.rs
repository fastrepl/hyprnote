mod argmax;
mod assemblyai;
mod deepgram;
mod deepgram_compat;
mod fireworks;
mod owhisper;
mod soniox;

pub use argmax::*;
pub use assemblyai::*;
pub use deepgram::*;
pub use fireworks::*;
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
    fn provider_name(&self) -> &'static str;

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

    fn parse_response(&self, raw: &str) -> Vec<StreamResponse>;
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

pub fn set_scheme_from_host(url: &mut url::Url) {
    if let Some(host) = url.host_str() {
        if is_local_host(host) {
            let _ = url.set_scheme("ws");
        } else {
            let _ = url.set_scheme("wss");
        }
    }
}

pub fn is_local_host(host: &str) -> bool {
    host == "127.0.0.1" || host == "localhost" || host == "0.0.0.0" || host == "::1"
}

pub fn extract_query_params(url: &url::Url) -> Vec<(String, String)> {
    url.query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect()
}

pub fn append_path_if_missing(url: &mut url::Url, suffix: &str) {
    let path = url.path().to_string();
    if !path.ends_with(suffix) && !path.ends_with(&format!("{}/", suffix)) {
        let mut new_path = path;
        if !new_path.ends_with('/') {
            new_path.push('/');
        }
        new_path.push_str(suffix.trim_start_matches('/'));
        url.set_path(&new_path);
    }
}

pub(crate) fn host_matches(base_url: &str, predicate: impl Fn(&str) -> bool) -> bool {
    url::Url::parse(base_url)
        .ok()
        .and_then(|u| u.host_str().map(&predicate))
        .unwrap_or(false)
}

fn is_local_stt_host(base_url: &str) -> bool {
    host_matches(base_url, is_local_host)
}

pub fn is_hyprnote_cloud_host(base_url: &str) -> bool {
    host_matches(base_url, |h| h.contains("hyprnote.com"))
}

pub fn append_provider_param(base_url: &str, provider: &str) -> String {
    if !is_hyprnote_cloud_host(base_url) {
        return base_url.to_string();
    }

    match url::Url::parse(base_url) {
        Ok(mut url) => {
            url.query_pairs_mut().append_pair("provider", provider);
            url.to_string()
        }
        Err(_) => base_url.to_string(),
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdapterKind {
    Argmax,
    Soniox,
    Fireworks,
    Deepgram,
    AssemblyAI,
}

impl AdapterKind {
    pub fn from_url_and_languages(base_url: &str, languages: &[hypr_language::Language]) -> Self {
        if is_hyprnote_cloud_host(base_url) {
            if DeepgramAdapter::is_supported_languages(languages) {
                Self::Deepgram
            } else {
                Self::Soniox
            }
        } else if is_local_stt_host(base_url) {
            Self::Argmax
        } else if AssemblyAIAdapter::is_host(base_url) {
            Self::AssemblyAI
        } else if SonioxAdapter::is_host(base_url) {
            Self::Soniox
        } else if FireworksAdapter::is_host(base_url) {
            Self::Fireworks
        } else {
            Self::Deepgram
        }
    }
}
