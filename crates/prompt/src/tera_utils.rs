use serde_json::Value;
use std::collections::HashMap;

pub fn get_arg<T: serde::de::DeserializeOwned>(
    args: &HashMap<String, Value>,
    key: &str,
) -> tera::Result<T> {
    serde_json::from_value(
        args.get(key)
            .ok_or(tera::Error::msg(format!("'{}' is required", key)))?
            .clone(),
    )
    .map_err(|e| tera::Error::msg(e.to_string()))
}
