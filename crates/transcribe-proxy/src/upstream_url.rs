use std::collections::{BTreeMap, BTreeSet};

use owhisper_providers::Params;

const MULTI_VALUE_KEYS: &[&str] = &["keywords", "keyterm"];

pub struct UpstreamUrlBuilder<'a> {
    base: url::Url,
    client_params: Option<Params>,
    default_params: Vec<(&'a str, &'a str)>,
}

impl<'a> UpstreamUrlBuilder<'a> {
    pub fn new(base: url::Url) -> Self {
        Self {
            base,
            client_params: None,
            default_params: Vec::new(),
        }
    }

    pub fn client_params(mut self, params: &Params) -> Self {
        self.client_params = Some(params.clone());
        self
    }

    pub fn default_params(mut self, params: &'a [(&'a str, &'a str)]) -> Self {
        self.default_params = params.to_vec();
        self
    }

    pub fn build(self) -> url::Url {
        let mut url = self.base;
        url.set_query(None);

        let params = match self.client_params {
            Some(p) => p,
            None => {
                if !self.default_params.is_empty() {
                    let mut query_pairs = url.query_pairs_mut();
                    for (key, value) in self.default_params {
                        query_pairs.append_pair(key, value);
                    }
                }
                return url;
            }
        };

        let mut single_params: BTreeMap<String, String> = BTreeMap::new();
        let mut multi_params: BTreeMap<String, Vec<String>> = BTreeMap::new();
        let mut client_keys: BTreeSet<String> = BTreeSet::new();

        for (key, _) in params.iter() {
            client_keys.insert(key.clone());
        }

        for (key, value) in &self.default_params {
            if !client_keys.contains(*key) {
                single_params.insert((*key).to_string(), (*value).to_string());
            }
        }

        for (key, value) in params.iter_expanded() {
            if MULTI_VALUE_KEYS.contains(&key) {
                multi_params
                    .entry(key.to_string())
                    .or_default()
                    .push(value.to_string());
            } else {
                single_params.insert(key.to_string(), value.to_string());
            }
        }

        let has_params = !single_params.is_empty() || !multi_params.is_empty();
        if has_params {
            let mut query_pairs = url.query_pairs_mut();
            for (key, value) in single_params {
                query_pairs.append_pair(&key, &value);
            }
            for (key, values) in multi_params {
                for value in values {
                    query_pairs.append_pair(&key, &value);
                }
            }
        }

        url
    }
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

    fn get_query_pairs(url: &url::Url) -> Vec<(String, String)> {
        url.query_pairs()
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect()
    }

    fn get_query_params(url: &url::Url) -> BTreeMap<String, String> {
        url.query_pairs()
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect()
    }

    #[test]
    fn test_defaults_only() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen".parse().unwrap();
        let defaults: &[(&str, &str)] = &[("model", "nova-3-general"), ("mip_opt_out", "false")];

        let url = UpstreamUrlBuilder::new(base)
            .default_params(defaults)
            .build();

        let params = get_query_params(&url);
        assert_eq!(params.get("model"), Some(&"nova-3-general".to_string()));
        assert_eq!(params.get("mip_opt_out"), Some(&"false".to_string()));
        assert_eq!(params.len(), 2);
    }

    #[test]
    fn test_client_params_only() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen".parse().unwrap();
        let client = make_params(&[
            ("encoding", "linear16"),
            ("sample_rate", "16000"),
            ("channels", "1"),
        ]);

        let url = UpstreamUrlBuilder::new(base).client_params(&client).build();

        let params = get_query_params(&url);
        assert_eq!(params.get("encoding"), Some(&"linear16".to_string()));
        assert_eq!(params.get("sample_rate"), Some(&"16000".to_string()));
        assert_eq!(params.get("channels"), Some(&"1".to_string()));
        assert_eq!(params.len(), 3);
    }

    #[test]
    fn test_client_overrides_defaults() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen".parse().unwrap();
        let defaults: &[(&str, &str)] = &[("model", "nova-3-general"), ("mip_opt_out", "false")];
        let client = make_params(&[("model", "nova-3"), ("mip_opt_out", "true")]);

        let url = UpstreamUrlBuilder::new(base)
            .default_params(defaults)
            .client_params(&client)
            .build();

        let params = get_query_params(&url);
        assert_eq!(
            params.get("model"),
            Some(&"nova-3".to_string()),
            "client model should override default"
        );
        assert_eq!(
            params.get("mip_opt_out"),
            Some(&"true".to_string()),
            "client mip_opt_out should override default"
        );
        assert_eq!(params.len(), 2);
    }

    #[test]
    fn test_partial_override() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen".parse().unwrap();
        let defaults: &[(&str, &str)] = &[("model", "nova-3-general"), ("mip_opt_out", "false")];
        let client = make_params(&[("model", "nova-3"), ("encoding", "linear16")]);

        let url = UpstreamUrlBuilder::new(base)
            .default_params(defaults)
            .client_params(&client)
            .build();

        let params = get_query_params(&url);
        assert_eq!(
            params.get("model"),
            Some(&"nova-3".to_string()),
            "client model should override default"
        );
        assert_eq!(
            params.get("mip_opt_out"),
            Some(&"false".to_string()),
            "default mip_opt_out should be preserved"
        );
        assert_eq!(
            params.get("encoding"),
            Some(&"linear16".to_string()),
            "client encoding should be added"
        );
        assert_eq!(params.len(), 3);
    }

    #[test]
    fn test_empty_params() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen".parse().unwrap();

        let url = UpstreamUrlBuilder::new(base.clone()).build();

        assert_eq!(url.query(), None);
        assert_eq!(url.as_str(), "wss://api.deepgram.com/v1/listen");
    }

    #[test]
    fn test_base_url_query_is_cleared() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen?existing=param"
            .parse()
            .unwrap();
        let client = make_params(&[("encoding", "linear16")]);

        let url = UpstreamUrlBuilder::new(base).client_params(&client).build();

        let params = get_query_params(&url);
        assert!(
            !params.contains_key("existing"),
            "existing query params should be cleared"
        );
        assert_eq!(params.get("encoding"), Some(&"linear16".to_string()));
        assert_eq!(params.len(), 1);
    }

    #[test]
    fn test_deterministic_ordering() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen".parse().unwrap();
        let client = make_params(&[("z_param", "z"), ("a_param", "a"), ("m_param", "m")]);

        let url1 = UpstreamUrlBuilder::new(base.clone())
            .client_params(&client)
            .build();
        let url2 = UpstreamUrlBuilder::new(base).client_params(&client).build();

        assert_eq!(
            url1.as_str(),
            url2.as_str(),
            "URL should be deterministic regardless of HashMap iteration order"
        );

        let query = url1.query().unwrap();
        assert!(
            query.starts_with("a_param="),
            "params should be sorted alphabetically"
        );
    }

    #[test]
    fn test_deepgram_real_world_scenario() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen".parse().unwrap();
        let defaults: &[(&str, &str)] = &[("model", "nova-3-general"), ("mip_opt_out", "false")];
        let client = Params::from(vec![
            ("model".to_string(), "nova-3".to_string()),
            ("mip_opt_out".to_string(), "true".to_string()),
            ("encoding".to_string(), "linear16".to_string()),
            ("sample_rate".to_string(), "16000".to_string()),
            ("channels".to_string(), "1".to_string()),
            ("keywords".to_string(), "hello".to_string()),
            ("keywords".to_string(), "world".to_string()),
        ]);

        let url = UpstreamUrlBuilder::new(base)
            .default_params(defaults)
            .client_params(&client)
            .build();

        let params = get_query_params(&url);

        assert_eq!(
            params.get("model"),
            Some(&"nova-3".to_string()),
            "client model should override default nova-3-general"
        );
        assert_eq!(
            params.get("mip_opt_out"),
            Some(&"true".to_string()),
            "client mip_opt_out should override default false"
        );
        assert_eq!(params.get("encoding"), Some(&"linear16".to_string()));
        assert_eq!(params.get("sample_rate"), Some(&"16000".to_string()));
        assert_eq!(params.get("channels"), Some(&"1".to_string()));
    }

    #[test]
    fn test_keywords_expanded() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen".parse().unwrap();
        let client = Params::from(vec![
            ("keywords".to_string(), "hello".to_string()),
            ("keywords".to_string(), "world".to_string()),
            ("keywords".to_string(), "test".to_string()),
        ]);

        let url = UpstreamUrlBuilder::new(base).client_params(&client).build();

        let pairs = get_query_pairs(&url);
        let keyword_pairs: Vec<_> = pairs
            .iter()
            .filter(|(k, _)| k == "keywords")
            .map(|(_, v)| v.as_str())
            .collect();
        assert_eq!(keyword_pairs, vec!["hello", "world", "test"]);
    }

    #[test]
    fn test_no_duplicate_params() {
        let base: url::Url = "wss://api.deepgram.com/v1/listen".parse().unwrap();
        let defaults: &[(&str, &str)] = &[("model", "nova-3-general"), ("mip_opt_out", "false")];
        let client = make_params(&[("model", "nova-3"), ("mip_opt_out", "true")]);

        let url = UpstreamUrlBuilder::new(base)
            .default_params(defaults)
            .client_params(&client)
            .build();

        let query = url.query().unwrap();
        let model_count = query.matches("model=").count();
        let mip_opt_out_count = query.matches("mip_opt_out=").count();

        assert_eq!(model_count, 1, "model should appear exactly once");
        assert_eq!(
            mip_opt_out_count, 1,
            "mip_opt_out should appear exactly once"
        );
    }
}
