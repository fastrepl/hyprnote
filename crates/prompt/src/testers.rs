use hypr_db::user::TranscriptBlock;
use serde_json::{from_value, Value};

pub fn language(lang: codes_iso_639::part_1::LanguageCode) -> impl tera::Test {
    Box::new(
        move |value: Option<&Value>, _args: &[Value]| -> tera::Result<bool> {
            if value.is_none() {
                return Err(tera::Error::msg("'value' is empty"));
            }

            let maybe_lhs = value.unwrap().as_str();
            if maybe_lhs.is_none() {
                return Err(tera::Error::msg("'value' is not a string"));
            }

            let lhs = maybe_lhs.unwrap().to_lowercase();
            let rhs = lang.code().to_lowercase();

            Ok(lhs == rhs)
        },
    )
}

pub fn duration(from: std::time::Duration, to: std::time::Duration) -> impl tera::Test {
    Box::new(
        move |value: Option<&Value>, _args: &[Value]| -> tera::Result<bool> {
            if value.is_none() {
                return Err(tera::Error::msg("'value' is empty"));
            }

            let transcripts: Vec<TranscriptBlock> = from_value(value.unwrap().clone())?;

            let start = transcripts.iter().map(|t| t.start).min().unwrap();
            let end = transcripts.iter().map(|t| t.end).max().unwrap();

            let d = std::time::Duration::from_secs(end as u64 - start as u64);
            Ok(d >= from && d <= to)
        },
    )
}
