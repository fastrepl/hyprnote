#[tauri::command]
#[specta::specta]
pub async fn render(tpl: String, ctx: String) -> Result<String, String> {
    let ctx: serde_json::Value = serde_json::from_str(&ctx).map_err(|e| e.to_string())?;
    let context = tera::Context::from_serialize(ctx).map_err(|e| e.to_string())?;

    let mut tera = tera::Tera::default();
    tera.register_filter("language", filters::language());
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
