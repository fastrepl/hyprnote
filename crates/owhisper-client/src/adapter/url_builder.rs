use owhisper_interface::ListenParams;
use owhisper_providers::Params;

pub trait ParamsExt {
    fn add_common_listen_params(
        &mut self,
        params: &ListenParams,
        channels: u8,
        default_model: Option<&str>,
    ) -> &mut Self;

    fn apply_to(&self, url: &mut url::Url);
}

impl ParamsExt for Params {
    fn add_common_listen_params(
        &mut self,
        params: &ListenParams,
        channels: u8,
        default_model: Option<&str>,
    ) -> &mut Self {
        let model = params
            .model
            .as_deref()
            .or(default_model)
            .unwrap_or("nova-3-general");
        self.add("model", model)
            .add("channels", channels)
            .add("sample_rate", params.sample_rate)
            .add("encoding", "linear16")
            .add_bool("diarize", true)
            .add_bool("punctuate", true)
            .add_bool("smart_format", true)
            .add_bool("numerals", true)
            .add_bool("filler_words", false)
            .add_bool("mip_opt_out", true)
    }

    fn apply_to(&self, url: &mut url::Url) {
        let mut query_pairs = url.query_pairs_mut();
        for (key, value) in self.iter_expanded() {
            query_pairs.append_pair(key, value);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_creates_empty_builder() {
        let params = Params::new();
        assert!(params.iter_expanded().next().is_none());
    }

    #[test]
    fn test_add_string_value() {
        let mut params = Params::new();
        params.add("model", "nova-3");
        assert_eq!(params.get("model"), Some("nova-3"));
    }

    #[test]
    fn test_add_numeric_value() {
        let mut params = Params::new();
        params.add("channels", 2);
        assert_eq!(params.get("channels"), Some("2"));
    }

    #[test]
    fn test_add_bool_true() {
        let mut params = Params::new();
        params.add_bool("diarize", true);
        assert_eq!(params.get("diarize"), Some("true"));
    }

    #[test]
    fn test_add_bool_false() {
        let mut params = Params::new();
        params.add_bool("diarize", false);
        assert_eq!(params.get("diarize"), Some("false"));
    }

    #[test]
    fn test_chaining() {
        let mut params = Params::new();
        params
            .add("model", "nova-3")
            .add("channels", 2)
            .add_bool("diarize", true);
        assert_eq!(params.get("model"), Some("nova-3"));
        assert_eq!(params.get("channels"), Some("2"));
        assert_eq!(params.get("diarize"), Some("true"));
    }

    #[test]
    fn test_apply_to_url() {
        let mut params = Params::new();
        params.add("model", "nova-3").add_bool("diarize", true);

        let mut url: url::Url = "https://api.example.com/listen".parse().unwrap();
        params.apply_to(&mut url);

        let query = url.query().unwrap();
        assert!(query.contains("model=nova-3"));
        assert!(query.contains("diarize=true"));
    }

    #[test]
    fn test_apply_to_url_with_multi_values() {
        let mut params = Params::new();
        params.add("model", "nova-3");
        params.insert_multi("keywords", vec!["hello", "world"]);

        let mut url: url::Url = "https://api.example.com/listen".parse().unwrap();
        params.apply_to(&mut url);

        let query = url.query().unwrap();
        assert!(query.contains("model=nova-3"));
        assert!(query.contains("keywords=hello"));
        assert!(query.contains("keywords=world"));
    }

    #[test]
    fn test_add_common_listen_params() {
        let mut params = Params::new();
        let listen_params = ListenParams {
            model: Some("nova-3".to_string()),
            sample_rate: 16000,
            ..Default::default()
        };
        params.add_common_listen_params(&listen_params, 2, None);

        assert_eq!(params.get("model"), Some("nova-3"));
        assert_eq!(params.get("channels"), Some("2"));
        assert_eq!(params.get("sample_rate"), Some("16000"));
        assert_eq!(params.get("encoding"), Some("linear16"));
        assert_eq!(params.get("diarize"), Some("true"));
        assert_eq!(params.get("punctuate"), Some("true"));
        assert_eq!(params.get("smart_format"), Some("true"));
        assert_eq!(params.get("numerals"), Some("true"));
        assert_eq!(params.get("filler_words"), Some("false"));
        assert_eq!(params.get("mip_opt_out"), Some("true"));
    }

    #[test]
    fn test_add_common_listen_params_default_model() {
        let mut params = Params::new();
        let listen_params = ListenParams::default();
        params.add_common_listen_params(&listen_params, 1, Some("custom-model"));

        assert_eq!(params.get("model"), Some("custom-model"));
    }

    #[test]
    fn test_add_common_listen_params_fallback_model() {
        let mut params = Params::new();
        let listen_params = ListenParams::default();
        params.add_common_listen_params(&listen_params, 1, None);

        assert_eq!(params.get("model"), Some("nova-3-general"));
    }
}
