use codes_iso_639::part_1::LanguageCode;

pub fn init(env: &mut minijinja::Environment) {
    env.set_unknown_method_callback(minijinja_contrib::pycompat::unknown_method_callback);

    env.add_filter("language", filters::language);

    [LanguageCode::En, LanguageCode::Ko]
        .iter()
        .for_each(|lang| {
            env.add_test(
                lang.language_name().to_lowercase(),
                testers::language(*lang),
            );
        });
}

// https://docs.rs/minijinja/latest/minijinja/filters/trait.Filter.html
mod filters {
    use codes_iso_639::part_1::LanguageCode;
    use std::str::FromStr;

    pub fn language(value: String) -> String {
        let lang_str = value.to_lowercase();
        let lang_code = LanguageCode::from_str(&lang_str).unwrap();
        lang_code.language_name().to_string()
    }
}

// https://docs.rs/minijinja/latest/minijinja/tests/index.html
mod testers {
    use codes_iso_639::part_1::LanguageCode;

    pub fn language(lang: LanguageCode) -> impl minijinja::tests::Test<bool, (String,)> {
        move |value: String| value.to_lowercase() == lang.code().to_lowercase()
    }
}
