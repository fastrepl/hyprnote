use crate::query_params::{QueryParams, QueryValue};

const MAX_KEYWORDS: usize = 100;
const MAX_KEYTERMS: usize = 50;

pub fn transform_client_params(params: &mut QueryParams) {
    limit_param(params, "keywords", MAX_KEYWORDS);
    limit_param(params, "keyterm", MAX_KEYTERMS);
}

fn limit_param(params: &mut QueryParams, key: &str, max: usize) {
    let Some(value) = params.get(key) else {
        return;
    };

    let new_value = match value {
        QueryValue::Single(s) => {
            let items: Vec<&str> = s.split(',').collect();
            if items.len() > max {
                Some(QueryValue::Single(items[..max].join(",")))
            } else {
                None
            }
        }
        QueryValue::Multi(v) => {
            if v.len() > max {
                Some(QueryValue::Multi(v[..max].to_vec()))
            } else {
                None
            }
        }
    };

    if let Some(new_value) = new_value {
        params.insert(key.to_string(), new_value);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_params(pairs: &[(&str, &str)]) -> QueryParams {
        let mut params = QueryParams::default();
        for (k, v) in pairs {
            params.insert(k.to_string(), QueryValue::Single(v.to_string()));
        }
        params
    }

    fn make_params_multi(pairs: &[(&str, Vec<&str>)]) -> QueryParams {
        let mut params = QueryParams::default();
        for (k, values) in pairs {
            let value = if values.len() == 1 {
                QueryValue::Single(values[0].to_string())
            } else {
                QueryValue::Multi(values.iter().map(|s| s.to_string()).collect())
            };
            params.insert(k.to_string(), value);
        }
        params
    }

    #[test]
    fn test_keywords_under_limit() {
        let mut params = make_params(&[("keywords", "hello,world,test")]);
        transform_client_params(&mut params);
        assert_eq!(params.get_first("keywords"), Some("hello,world,test"));
    }

    #[test]
    fn test_keywords_over_limit() {
        let keywords: Vec<String> = (0..150).map(|i| format!("word{}", i)).collect();
        let keywords_str = keywords.join(",");
        let mut params = make_params(&[("keywords", &keywords_str)]);

        transform_client_params(&mut params);

        let result = params.get_first("keywords").unwrap();
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

        let result = params.get_first("keyterm").unwrap();
        let result_count = result.split(',').count();
        assert_eq!(result_count, MAX_KEYTERMS);
    }

    #[test]
    fn test_no_keywords_param() {
        let mut params = make_params(&[("model", "nova-3")]);
        transform_client_params(&mut params);
        assert_eq!(params.get_first("model"), Some("nova-3"));
        assert!(params.get_first("keywords").is_none());
    }

    #[test]
    fn test_empty_keywords() {
        let mut params = make_params(&[("keywords", "")]);
        transform_client_params(&mut params);
        assert_eq!(params.get_first("keywords"), Some(""));
    }

    #[test]
    fn test_multi_value_keywords_under_limit() {
        let keywords: Vec<&str> = vec!["hello", "world", "test"];
        let mut params = make_params_multi(&[("keywords", keywords.clone())]);
        transform_client_params(&mut params);

        match params.get("keywords") {
            Some(QueryValue::Multi(v)) => {
                assert_eq!(v, &["hello", "world", "test"]);
            }
            _ => panic!("expected Multi value"),
        }
    }

    #[test]
    fn test_multi_value_keywords_over_limit() {
        let keywords: Vec<&str> = (0..150).map(|_| "word").collect();
        let mut params = make_params_multi(&[("keywords", keywords)]);

        transform_client_params(&mut params);

        match params.get("keywords") {
            Some(QueryValue::Multi(v)) => {
                assert_eq!(v.len(), MAX_KEYWORDS);
            }
            _ => panic!("expected Multi value"),
        }
    }
}
