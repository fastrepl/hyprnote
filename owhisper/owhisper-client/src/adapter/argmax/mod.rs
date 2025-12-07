mod batch;
mod keywords;
mod language;
mod live;

pub use batch::{StreamingBatchConfig, StreamingBatchEvent, StreamingBatchStream};

#[derive(Clone, Default)]
pub struct ArgmaxAdapter;

impl ArgmaxAdapter {
    pub fn is_supported_languages(_languages: &[hypr_language::Language]) -> bool {
        true
    }
}
