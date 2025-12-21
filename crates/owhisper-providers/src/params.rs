use std::collections::HashMap;

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct Params(HashMap<String, Vec<String>>);

impl Params {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(|v| v.first()).map(String::as_str)
    }

    pub fn get_all(&self, key: &str) -> Option<&[String]> {
        self.0.get(key).map(Vec::as_slice)
    }

    pub fn insert(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.0.insert(key.into(), vec![value.into()]);
    }

    pub fn insert_multi<I, V>(&mut self, key: impl Into<String>, values: I)
    where
        I: IntoIterator<Item = V>,
        V: Into<String>,
    {
        let values: Vec<String> = values.into_iter().map(Into::into).collect();
        if !values.is_empty() {
            self.0.insert(key.into(), values);
        }
    }

    pub fn add(&mut self, key: &str, value: impl ToString) -> &mut Self {
        self.insert(key, value.to_string());
        self
    }

    pub fn add_bool(&mut self, key: &str, value: bool) -> &mut Self {
        self.insert(key, if value { "true" } else { "false" });
        self
    }

    pub fn remove(&mut self, key: &str) -> Option<Vec<String>> {
        self.0.remove(key)
    }

    pub fn contains_key(&self, key: &str) -> bool {
        self.0.contains_key(key)
    }

    pub fn limit_multi(&mut self, key: &str, max: usize) {
        if let Some(values) = self.0.get_mut(key) {
            values.truncate(max);
        }
    }

    pub fn iter(&self) -> impl Iterator<Item = (&String, &Vec<String>)> {
        self.0.iter()
    }

    pub fn iter_expanded(&self) -> impl Iterator<Item = (&str, &str)> {
        self.0.iter().flat_map(|(key, values)| {
            values
                .iter()
                .filter(|v| !v.is_empty())
                .map(move |v| (key.as_str(), v.as_str()))
        })
    }

    pub fn add_keywords(&mut self, keywords: &[String]) -> &mut Self {
        if keywords.is_empty() {
            return self;
        }
        self.insert_multi("_keywords", keywords.iter().cloned());
        self
    }

    pub fn add_languages(&mut self, languages: &[impl AsRef<str>]) -> &mut Self {
        if languages.is_empty() {
            return self;
        }
        self.insert_multi(
            "_languages",
            languages.iter().map(|l| l.as_ref().to_string()),
        );
        self
    }

    pub fn take_keywords(&mut self) -> Vec<String> {
        self.remove("_keywords").unwrap_or_default()
    }

    pub fn take_languages(&mut self) -> Vec<String> {
        self.remove("_languages").unwrap_or_default()
    }
}

impl From<HashMap<String, String>> for Params {
    fn from(map: HashMap<String, String>) -> Self {
        Self(map.into_iter().map(|(k, v)| (k, vec![v])).collect())
    }
}

impl From<Vec<(String, String)>> for Params {
    fn from(pairs: Vec<(String, String)>) -> Self {
        let mut map: HashMap<String, Vec<String>> = HashMap::new();
        for (key, value) in pairs {
            map.entry(key).or_default().push(value);
        }
        Self(map)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_params(pairs: &[(&str, &str)]) -> Params {
        let map: HashMap<String, String> = pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        Params::from(map)
    }

    #[test]
    fn test_from_hashmap() {
        let mut map = HashMap::new();
        map.insert("key".to_string(), "value".to_string());
        let params = Params::from(map);
        assert_eq!(params.get("key"), Some("value"));
    }

    #[test]
    fn test_insert_remove() {
        let mut params = Params::new();
        params.insert("key", "value");
        assert_eq!(params.get("key"), Some("value"));
        assert_eq!(params.remove("key"), Some(vec!["value".to_string()]));
        assert_eq!(params.get("key"), None);
    }

    #[test]
    fn test_limit_multi() {
        let pairs = vec![
            ("keywords".to_string(), "a".to_string()),
            ("keywords".to_string(), "b".to_string()),
            ("keywords".to_string(), "c".to_string()),
            ("keywords".to_string(), "d".to_string()),
            ("keywords".to_string(), "e".to_string()),
        ];
        let mut params = Params::from(pairs);
        params.limit_multi("keywords", 3);
        assert_eq!(
            params.get_all("keywords"),
            Some(["a", "b", "c"].map(String::from).as_slice())
        );
    }

    #[test]
    fn test_iter_expanded_single() {
        let params = make_params(&[("model", "nova-3")]);
        let pairs: Vec<_> = params.iter_expanded().collect();
        assert_eq!(pairs, vec![("model", "nova-3")]);
    }

    #[test]
    fn test_iter_expanded_multi() {
        let pairs = vec![
            ("keywords".to_string(), "hello".to_string()),
            ("keywords".to_string(), "world".to_string()),
            ("keywords".to_string(), "test".to_string()),
        ];
        let params = Params::from(pairs);
        let expanded: Vec<_> = params.iter_expanded().collect();
        assert_eq!(
            expanded,
            vec![
                ("keywords", "hello"),
                ("keywords", "world"),
                ("keywords", "test")
            ]
        );
    }

    #[test]
    fn test_iter_expanded_filters_empty() {
        let pairs = vec![
            ("keywords".to_string(), "hello".to_string()),
            ("keywords".to_string(), "".to_string()),
            ("keywords".to_string(), "world".to_string()),
        ];
        let params = Params::from(pairs);
        let expanded: Vec<_> = params.iter_expanded().collect();
        assert_eq!(expanded, vec![("keywords", "hello"), ("keywords", "world")]);
    }

    #[test]
    fn test_iter_expanded_mixed() {
        let pairs = vec![
            ("model".to_string(), "nova-3".to_string()),
            ("keywords".to_string(), "a".to_string()),
            ("keywords".to_string(), "b".to_string()),
        ];
        let params = Params::from(pairs);
        let mut expanded: Vec<_> = params.iter_expanded().collect();
        expanded.sort();
        assert_eq!(
            expanded,
            vec![("keywords", "a"), ("keywords", "b"), ("model", "nova-3")]
        );
    }

    #[test]
    fn test_from_vec_pairs_single() {
        let pairs = vec![("model".to_string(), "nova-3".to_string())];
        let params = Params::from(pairs);
        assert_eq!(params.get("model"), Some("nova-3"));
    }

    #[test]
    fn test_from_vec_pairs_duplicates() {
        let pairs = vec![
            ("keywords".to_string(), "type".to_string()),
            ("keywords".to_string(), "doc".to_string()),
            ("keywords".to_string(), "content".to_string()),
        ];
        let params = Params::from(pairs);
        assert_eq!(params.get("keywords"), Some("type"));
        assert_eq!(
            params.get_all("keywords"),
            Some(["type", "doc", "content"].map(String::from).as_slice())
        );
    }

    #[test]
    fn test_from_vec_pairs_mixed() {
        let pairs = vec![
            ("provider".to_string(), "deepgram".to_string()),
            ("keywords".to_string(), "type".to_string()),
            ("model".to_string(), "nova-3".to_string()),
            ("keywords".to_string(), "doc".to_string()),
        ];
        let params = Params::from(pairs);
        assert_eq!(params.get("provider"), Some("deepgram"));
        assert_eq!(params.get("model"), Some("nova-3"));
        assert_eq!(
            params.get_all("keywords"),
            Some(["type", "doc"].map(String::from).as_slice())
        );
    }

    #[test]
    fn test_get_all_single_value() {
        let params = make_params(&[("model", "nova-3")]);
        assert_eq!(
            params.get_all("model"),
            Some(["nova-3"].map(String::from).as_slice())
        );
    }

    #[test]
    fn test_add_keywords() {
        let mut params = Params::new();
        params.add_keywords(&["hello".to_string(), "world".to_string()]);
        assert_eq!(
            params.get_all("_keywords"),
            Some(["hello", "world"].map(String::from).as_slice())
        );
    }

    #[test]
    fn test_take_keywords() {
        let mut params = Params::new();
        params.add_keywords(&["hello".to_string(), "world".to_string()]);
        let keywords = params.take_keywords();
        assert_eq!(keywords, vec!["hello", "world"]);
        assert!(params.get_all("_keywords").is_none());
    }

    #[test]
    fn test_add_languages() {
        let mut params = Params::new();
        params.add_languages(&["en", "es"]);
        assert_eq!(
            params.get_all("_languages"),
            Some(["en", "es"].map(String::from).as_slice())
        );
    }

    #[test]
    fn test_take_languages() {
        let mut params = Params::new();
        params.add_languages(&["en", "es"]);
        let languages = params.take_languages();
        assert_eq!(languages, vec!["en", "es"]);
        assert!(params.get_all("_languages").is_none());
    }
}
