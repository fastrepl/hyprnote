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
    mod filters {
        pub use super::super::*;
    }

    use super::*;
    use askama::Template;
    use askama_utils::tpl_assert;

    #[test]
    fn test_isolang() {
        assert!(matches!(Language::from_639_1("en"), Some(Language::Eng)));
        assert!(matches!(Language::from_639_1("ko"), Some(Language::Kor)));

        assert!(matches!(Language::from_639_1("EN"), None));
        assert!(matches!(Language::from_639_1("KO"), None));
    }

    #[derive(Template)]
    #[template(source = "{{ lang|language }}", ext = "txt")]
    struct LanguageFilterTest {
        lang: Option<String>,
    }

    tpl_assert!(
        test_language_filter_english,
        LanguageFilterTest {
            lang: Some("en".to_string())
        },
        |v| v == "English"
    );

    tpl_assert!(
        test_language_filter_korean,
        LanguageFilterTest {
            lang: Some("ko".to_string())
        },
        |v| v == "Korean"
    );

    tpl_assert!(
        test_language_filter_uppercase_defaults_to_english,
        LanguageFilterTest {
            lang: Some("EN".to_string())
        },
        |v| v == "English"
    );

    tpl_assert!(
        test_language_filter_none_defaults_to_english,
        LanguageFilterTest { lang: None },
        |v| v == "English"
    );

    #[derive(Template)]
    #[template(
        source = "{% if lang|is_english %}yes{% else %}no{% endif %}",
        ext = "txt"
    )]
    struct IsEnglishFilterTest {
        lang: Option<String>,
    }

    tpl_assert!(
        test_is_english_filter_with_en,
        IsEnglishFilterTest {
            lang: Some("en".to_string())
        },
        |v| v == "yes"
    );

    tpl_assert!(
        test_is_english_filter_with_ko,
        IsEnglishFilterTest {
            lang: Some("ko".to_string())
        },
        |v| v == "no"
    );

    tpl_assert!(
        test_is_english_filter_none_defaults_to_english,
        IsEnglishFilterTest { lang: None },
        |v| v == "yes"
    );

    #[derive(Template)]
    #[template(
        source = "{% if lang|is_korean %}yes{% else %}no{% endif %}",
        ext = "txt"
    )]
    struct IsKoreanFilterTest {
        lang: Option<String>,
    }

    tpl_assert!(
        test_is_korean_filter_with_ko,
        IsKoreanFilterTest {
            lang: Some("ko".to_string())
        },
        |v| v == "yes"
    );

    tpl_assert!(
        test_is_korean_filter_with_en,
        IsKoreanFilterTest {
            lang: Some("en".to_string())
        },
        |v| v == "no"
    );

    tpl_assert!(
        test_is_korean_filter_none_defaults_to_english,
        IsKoreanFilterTest { lang: None },
        |v| v == "no"
    );
}
