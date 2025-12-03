mod batch;
mod keywords;
mod language;
mod live;

// https://github.com/argmaxinc/WhisperKit
#[derive(Clone, Default)]
pub struct ArgmaxAdapter;

impl ArgmaxAdapter {
    pub fn is_supported_languages(_languages: &[hypr_language::Language]) -> bool {
        true
    }
}
