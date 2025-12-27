use isolang::Language;

#[askama::filter_fn]
pub fn language(value: &Option<String>, _env: &dyn askama::Values) -> askama::Result<String> {
    let v = value.as_deref().unwrap_or("").to_lowercase();
    let lang = Language::from_639_1(&v).unwrap_or(Language::from_639_1("en").unwrap());
    Ok(lang.to_name().to_string())
}

#[askama::filter_fn]
pub fn is_english(value: &Option<String>, _env: &dyn askama::Values) -> askama::Result<bool> {
    let v = value.as_deref().unwrap_or("en").to_lowercase();
    let lang = Language::from_639_1(&v);
    Ok(matches!(lang, Some(Language::Eng)))
}

#[askama::filter_fn]
pub fn is_korean(value: &Option<String>, _env: &dyn askama::Values) -> askama::Result<bool> {
    let v = value.as_deref().unwrap_or("en").to_lowercase();
    let lang = Language::from_639_1(&v);
    Ok(matches!(lang, Some(Language::Kor)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_isolang() {
        assert!(matches!(Language::from_639_1("en"), Some(Language::Eng)));
        assert!(matches!(Language::from_639_1("ko"), Some(Language::Kor)));

        assert!(matches!(Language::from_639_1("EN"), None));
        assert!(matches!(Language::from_639_1("KO"), None));
    }
}
