pub mod realtime;
pub mod recorded;

#[derive(Debug, serde::Deserialize)]
pub struct Params {
    language: codes_iso_639::part_1::LanguageCode,
}
