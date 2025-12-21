use crate::{Params, Provider};

const NOVA2_MULTI_LANGS: &[&str] = &["en", "es"];
const NOVA3_MULTI_LANGS: &[&str] = &["en", "es", "fr", "de", "hi", "ru", "pt", "ja", "it", "nl"];

const PARAKEET_V3_LANGS: &[&str] = &[
    "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hr", "hu", "it", "lt", "lv", "mt",
    "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "uk",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum KeywordMode {
    DeepgramNova3,
    DeepgramNova2,
    Keyterm,
}

impl KeywordMode {
    fn from_model(model: &str, provider: Provider) -> Self {
        if provider == Provider::Argmax {
            Self::Keyterm
        } else if model.contains("nova-2") {
            Self::DeepgramNova2
        } else {
            Self::DeepgramNova3
        }
    }

    fn param_name(&self) -> &'static str {
        match self {
            Self::DeepgramNova3 => "keywords",
            Self::DeepgramNova2 => "keyterm",
            Self::Keyterm => "keyterm",
        }
    }

    fn max_count(&self) -> usize {
        match self {
            Self::DeepgramNova3 => 50,
            Self::DeepgramNova2 => 100,
            Self::Keyterm => 100,
        }
    }
}

fn apply_keywords(url: &mut url::Url, keywords: Vec<String>, mode: KeywordMode) {
    if keywords.is_empty() {
        return;
    }

    let param_name = mode.param_name();
    let max_count = mode.max_count();

    let mut query_pairs = url.query_pairs_mut();
    for keyword in keywords.into_iter().take(max_count) {
        query_pairs.append_pair(param_name, &keyword);
    }
}

fn apply_languages(url: &mut url::Url, languages: Vec<String>, model: &str, provider: Provider) {
    if provider == Provider::Argmax {
        apply_argmax_languages(url, languages, model);
    } else {
        apply_deepgram_languages(url, languages, model);
    }
}

fn apply_deepgram_languages(url: &mut url::Url, languages: Vec<String>, model: &str) {
    let mut query_pairs = url.query_pairs_mut();

    match languages.len() {
        0 => {
            query_pairs.append_pair("detect_language", "true");
        }
        1 => {
            if let Some(lang) = languages.first() {
                query_pairs.append_pair("language", lang);
            }
        }
        _ => {
            if can_use_multi_deepgram(model, &languages) {
                query_pairs.append_pair("language", "multi");
                for lang in &languages {
                    query_pairs.append_pair("languages", lang);
                }
            } else {
                query_pairs.append_pair("detect_language", "true");
                for lang in &languages {
                    query_pairs.append_pair("languages", lang);
                }
            }
        }
    }
}

fn can_use_multi_deepgram(model: &str, languages: &[String]) -> bool {
    if languages.len() < 2 {
        return false;
    }

    let multi_langs: &[&str] = if model.contains("nova-3") {
        NOVA3_MULTI_LANGS
    } else if model.contains("nova-2") {
        NOVA2_MULTI_LANGS
    } else {
        return false;
    };

    languages
        .iter()
        .all(|lang| multi_langs.contains(&lang.as_str()))
}

fn apply_argmax_languages(url: &mut url::Url, languages: Vec<String>, model: &str) {
    let lang = pick_argmax_language(model, &languages);
    let mut query_pairs = url.query_pairs_mut();
    query_pairs.append_pair("language", lang);
}

fn pick_argmax_language<'a>(model: &str, languages: &'a [String]) -> &'a str {
    if model.contains("parakeet") && model.contains("v2") {
        return "en";
    }

    if model.contains("parakeet") && model.contains("v3") {
        return languages
            .iter()
            .find(|lang| PARAKEET_V3_LANGS.contains(&lang.as_str()))
            .map(|s| s.as_str())
            .unwrap_or("en");
    }

    languages.first().map(|s| s.as_str()).unwrap_or("en")
}

pub trait ParamsTransform {
    fn apply_keywords_and_languages(&mut self, url: &mut url::Url, provider: Provider);
}

impl ParamsTransform for Params {
    fn apply_keywords_and_languages(&mut self, url: &mut url::Url, provider: Provider) {
        let model = self.get("model").unwrap_or("").to_string();
        let keywords = self.take_keywords();
        let languages = self.take_languages();

        let keyword_mode = KeywordMode::from_model(&model, provider);
        apply_keywords(url, keywords, keyword_mode);
        apply_languages(url, languages, &model, provider);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keyword_mode_deepgram_nova3() {
        let mode = KeywordMode::from_model("nova-3-general", Provider::Deepgram);
        assert_eq!(mode, KeywordMode::DeepgramNova3);
        assert_eq!(mode.param_name(), "keywords");
        assert_eq!(mode.max_count(), 50);
    }

    #[test]
    fn test_keyword_mode_deepgram_nova2() {
        let mode = KeywordMode::from_model("nova-2", Provider::Deepgram);
        assert_eq!(mode, KeywordMode::DeepgramNova2);
        assert_eq!(mode.param_name(), "keyterm");
        assert_eq!(mode.max_count(), 100);
    }

    #[test]
    fn test_keyword_mode_argmax() {
        let mode = KeywordMode::from_model("any-model", Provider::Argmax);
        assert_eq!(mode, KeywordMode::Keyterm);
        assert_eq!(mode.param_name(), "keyterm");
    }

    #[test]
    fn test_apply_keywords() {
        let mut url: url::Url = "https://api.example.com/listen".parse().unwrap();
        apply_keywords(
            &mut url,
            vec!["hello".to_string(), "world".to_string()],
            KeywordMode::DeepgramNova3,
        );

        let query = url.query().unwrap();
        assert!(query.contains("keywords=hello"));
        assert!(query.contains("keywords=world"));
    }

    #[test]
    fn test_apply_deepgram_single_language() {
        let mut url: url::Url = "https://api.example.com/listen".parse().unwrap();
        apply_languages(
            &mut url,
            vec!["en".to_string()],
            "nova-3",
            Provider::Deepgram,
        );

        let query = url.query().unwrap();
        assert!(query.contains("language=en"));
    }

    #[test]
    fn test_apply_deepgram_no_language() {
        let mut url: url::Url = "https://api.example.com/listen".parse().unwrap();
        apply_languages(&mut url, vec![], "nova-3", Provider::Deepgram);

        let query = url.query().unwrap();
        assert!(query.contains("detect_language=true"));
    }

    #[test]
    fn test_apply_deepgram_multi_language() {
        let mut url: url::Url = "https://api.example.com/listen".parse().unwrap();
        apply_languages(
            &mut url,
            vec!["en".to_string(), "es".to_string()],
            "nova-3",
            Provider::Deepgram,
        );

        let query = url.query().unwrap();
        assert!(query.contains("language=multi"));
        assert!(query.contains("languages=en"));
        assert!(query.contains("languages=es"));
    }

    #[test]
    fn test_apply_argmax_language() {
        let mut url: url::Url = "https://api.example.com/listen".parse().unwrap();
        apply_languages(
            &mut url,
            vec!["de".to_string(), "en".to_string()],
            "parakeet-v3",
            Provider::Argmax,
        );

        let query = url.query().unwrap();
        assert!(query.contains("language=de"));
    }
}
