use std::collections::HashMap;

const MAX_KEYWORDS: usize = 100;
const MAX_KEYTERMS: usize = 50;

pub fn transform_client_params(params: &mut HashMap<String, String>) {
    limit_param(params, "keywords", MAX_KEYWORDS);
    limit_param(params, "keyterm", MAX_KEYTERMS);
}

fn limit_param(params: &mut HashMap<String, String>, key: &str, max: usize) {
    if let Some(value) = params.get(key) {
        let items: Vec<&str> = value.split(',').collect();
        if items.len() > max {
            let limited: String = items[..max].join(",");
            params.insert(key.to_string(), limited);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_params(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn test_keywords_under_limit() {
        let mut params = make_params(&[("keywords", "hello,world,test")]);
        transform_client_params(&mut params);
        assert_eq!(
            params.get("keywords"),
            Some(&"hello,world,test".to_string())
        );
    }

    #[test]
    fn test_keywords_over_limit() {
        let keywords: Vec<String> = (0..150).map(|i| format!("word{}", i)).collect();
        let keywords_str = keywords.join(",");
        let mut params = make_params(&[("keywords", &keywords_str)]);

        transform_client_params(&mut params);

        let result = params.get("keywords").unwrap();
        let result_count = result.split(',').count();
        assert_eq!(result_count, MAX_KEYWORDS);
        assert!(result.starts_with("word0,word1,"));
    }

    #[test]
    fn test_keyterm_over_limit() {
        let keywords: Vec<String> = (0..150).map(|i| format!("term{}", i)).collect();
        let keywords_str = keywords.join(",");
        let mut params = make_params(&[("keyterm", &keywords_str)]);

        transform_client_params(&mut params);

        let result = params.get("keyterm").unwrap();
        let result_count = result.split(',').count();
        assert_eq!(result_count, MAX_KEYTERMS);
    }

    #[test]
    fn test_no_keywords_param() {
        let mut params = make_params(&[("model", "nova-3")]);
        transform_client_params(&mut params);
        assert_eq!(params.get("model"), Some(&"nova-3".to_string()));
        assert!(params.get("keywords").is_none());
    }

    #[test]
    fn test_empty_keywords() {
        let mut params = make_params(&[("keywords", "")]);
        transform_client_params(&mut params);
        assert_eq!(params.get("keywords"), Some(&"".to_string()));
    }
}
