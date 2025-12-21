use owhisper_providers::{Params, Provider};

const MAX_KEYWORDS: usize = 100;
const MAX_KEYTERMS: usize = 50;

pub fn transform_client_params(params: &mut Params, provider: Provider) {
    params.remove("model");
    if let Some(model) = provider.default_live_model() {
        params.insert("model", model);
    }

    params.limit_multi("keywords", MAX_KEYWORDS);
    params.limit_multi("keyterm", MAX_KEYTERMS);
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;

    fn make_params(pairs: &[(&str, &str)]) -> Params {
        let map: HashMap<String, String> = pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        Params::from(map)
    }

    fn make_multi_params(pairs: Vec<(String, String)>) -> Params {
        Params::from(pairs)
    }

    #[test]
    fn test_keywords_under_limit() {
        let mut params = make_multi_params(vec![
            ("keywords".to_string(), "hello".to_string()),
            ("keywords".to_string(), "world".to_string()),
            ("keywords".to_string(), "test".to_string()),
        ]);
        transform_client_params(&mut params, Provider::Deepgram);
        assert_eq!(
            params.get_all("keywords"),
            Some(["hello", "world", "test"].map(String::from).as_slice())
        );
    }

    #[test]
    fn test_keywords_over_limit() {
        let pairs: Vec<(String, String)> = (0..150)
            .map(|i| ("keywords".to_string(), format!("word{}", i)))
            .collect();
        let mut params = make_multi_params(pairs);

        transform_client_params(&mut params, Provider::Deepgram);

        let result = params.get_all("keywords").unwrap();
        assert_eq!(result.len(), MAX_KEYWORDS);
        assert_eq!(result[0], "word0");
        assert_eq!(result[1], "word1");
    }

    #[test]
    fn test_keyterm_over_limit() {
        let pairs: Vec<(String, String)> = (0..150)
            .map(|i| ("keyterm".to_string(), format!("term{}", i)))
            .collect();
        let mut params = make_multi_params(pairs);

        transform_client_params(&mut params, Provider::Deepgram);

        let result = params.get_all("keyterm").unwrap();
        assert_eq!(result.len(), MAX_KEYTERMS);
    }

    #[test]
    fn test_model_override() {
        let mut params = make_params(&[("model", "cloud")]);
        transform_client_params(&mut params, Provider::Deepgram);
        assert_eq!(params.get("model"), Some("nova-3-general"));
    }

    #[test]
    fn test_model_override_soniox() {
        let mut params = make_params(&[("model", "cloud")]);
        transform_client_params(&mut params, Provider::Soniox);
        assert_eq!(params.get("model"), Some("stt-v3"));
    }

    #[test]
    fn test_model_override_gladia() {
        let mut params = make_params(&[("model", "cloud")]);
        transform_client_params(&mut params, Provider::Gladia);
        assert_eq!(params.get("model"), Some("solaria-1"));
    }

    #[test]
    fn test_model_override_provider_without_default() {
        let mut params = make_params(&[("model", "cloud")]);
        transform_client_params(&mut params, Provider::Fireworks);
        assert!(params.get("model").is_none());
    }

    #[test]
    fn test_empty_keywords() {
        let mut params = make_params(&[("keywords", "")]);
        transform_client_params(&mut params, Provider::Deepgram);
        assert_eq!(params.get("keywords"), Some(""));
    }
}
