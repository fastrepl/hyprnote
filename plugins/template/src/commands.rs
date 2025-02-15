use codes_iso_639::part_1::LanguageCode;

#[tauri::command]
#[specta::specta]
pub async fn render(tpl: String, ctx: String) -> Result<String, String> {
    let ctx: serde_json::Value = serde_json::from_str(&ctx).map_err(|e| e.to_string())?;
    let context = tera::Context::from_serialize(ctx).map_err(|e| e.to_string())?;

    let mut tera = tera::Tera::default();

    tera.register_filter("language", filters::language());

    [LanguageCode::En, LanguageCode::Ko]
        .iter()
        .for_each(|lang| {
            tera.register_tester(
                lang.language_name().to_lowercase().as_str(),
                testers::language(*lang),
            );
        });

    tera.autoescape_on(vec![]);

    tera.render_str(&tpl, &context).map_err(|e| e.to_string())
}

mod filters {
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
}

mod testers {
    use codes_iso_639::part_1::LanguageCode;
    use serde_json::Value;

    pub fn language(lang: LanguageCode) -> impl tera::Test {
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
}
