use isolang::Language;
use std::fmt::Display;

#[askama::filter_fn]
pub fn language<T: Display>(value: T, _env: &dyn askama::Values) -> askama::Result<String> {
    let v = value.to_string();
    let lang = Language::from_639_1(&v).unwrap_or(Language::from_639_1("en").unwrap());
    Ok(lang.to_name().to_string())
}
