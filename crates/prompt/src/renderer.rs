use codes_iso_639::part_1::{LanguageCode, LanguageCode::*};
use serde_json::Value;
use std::{collections::HashMap, str::FromStr};

pub fn language() -> impl tera::Filter {
    Box::new(
        move |value: &Value, _args: &HashMap<String, Value>| -> tera::Result<Value> {
            let lang_str = value.as_str().map(|s| s.to_lowercase());
            let lang_code = lang_str.and_then(|s| LanguageCode::from_str(&s).ok());

            match lang_code {
                Some(En) => Ok(s("Output language is 'English'. Do not include any other language in the output.")),
                Some(Ko) => Ok(s("Output language is 'Korean'. Note that it is common to use English for specific words or phrases while writing in Korean.")),
                Some(Ja) => Ok(s("Output language is 'Japanese'. Note that it is common to use English for specific words or phrases while writing in Japanese.")),
                _ => Ok(s("Output language is not specified. Try your best to pick the most appropriate language, or fallback to English.")),
            }
        },
    )
}

fn s(v: impl Into<String>) -> Value {
    Value::String(v.into())
}
