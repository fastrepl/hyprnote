// https://docs.rs/minijinja/latest/minijinja/tests/index.html
use codes_iso_639::part_1::LanguageCode;

pub fn language(lang: LanguageCode) -> impl minijinja::tests::Test<bool, (String,)> {
    move |value: String| value.to_lowercase() == lang.code().to_lowercase()
}
