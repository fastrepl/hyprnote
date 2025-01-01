pub fn schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "properties": {
            "text": { "type": "string" }
        }
    })
}

pub fn validator() -> anyhow::Result<jsonschema::Validator> {
    Ok(jsonschema::validator_for(&schema())?)
}
