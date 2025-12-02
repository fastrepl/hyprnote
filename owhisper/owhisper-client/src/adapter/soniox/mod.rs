mod batch;
mod live;

use owhisper_interface::ListenParams;

pub(crate) const DEFAULT_API_BASE: &str = "https://api.soniox.com";

#[derive(Clone, Default)]
pub struct SonioxAdapter;

impl SonioxAdapter {
    pub(crate) fn language_hints(params: &ListenParams) -> Vec<String> {
        params
            .languages
            .iter()
            .map(|lang| lang.iso639().code().to_string())
            .collect()
    }

    pub(crate) fn api_base_url(api_base: &str) -> String {
        if api_base.is_empty() {
            DEFAULT_API_BASE.to_string()
        } else {
            api_base.trim_end_matches('/').to_string()
        }
    }
}
