mod batch;
mod live;

use owhisper_interface::ListenParams;

use super::DeepgramAdapter;

const PARAKEET_V3_LANGS: &[&str] = &[
    "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hr", "hu", "it", "lt", "lv", "mt",
    "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "uk",
];

#[derive(Clone, Default)]
pub struct ArgmaxAdapter {
    inner: DeepgramAdapter,
}

impl ArgmaxAdapter {
    pub(crate) fn adapt_params(params: &ListenParams) -> ListenParams {
        let mut adapted = params.clone();
        let model = params.model.as_deref().unwrap_or("");

        let lang = if model.contains("parakeet") && model.contains("v2") {
            hypr_language::ISO639::En.into()
        } else if model.contains("parakeet") && model.contains("v3") {
            params
                .languages
                .iter()
                .find(|lang| PARAKEET_V3_LANGS.contains(&lang.iso639().code()))
                .cloned()
                .unwrap_or_else(|| hypr_language::ISO639::En.into())
        } else {
            params
                .languages
                .first()
                .cloned()
                .unwrap_or_else(|| hypr_language::ISO639::En.into())
        };

        adapted.languages = vec![lang];
        adapted
    }
}
