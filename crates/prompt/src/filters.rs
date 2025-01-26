use codes_iso_639::part_1::LanguageCode;
use serde_json::Value;
use std::{collections::HashMap, str::FromStr};

pub fn language() -> impl tera::Filter {
    Box::new(
        move |value: &Value, _args: &HashMap<String, Value>| -> tera::Result<Value> {
            let lang_str = value.as_str().map(|s| s.to_lowercase());
            let lang_code = lang_str.and_then(|s| LanguageCode::from_str(&s).ok());

            if lang_code.is_none() {
                Err(tera::Error::msg("'value' is not a valid language code"))
            } else {
                let lang_name = lang_code.unwrap().language_name();
                Ok(Value::String(lang_name.to_string()))
            }
        },
    )
}
