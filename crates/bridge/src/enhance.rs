// https://platform.openai.com/docs/guides/structured-outputs
pub fn schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "The enhanced and formatted text output"
            }
        },
        "required": ["text"],
        "additionalProperties": false,
        "name": "enhance",
        "description": "Enhance and format the given text"
    })
}

pub fn validator() -> anyhow::Result<jsonschema::Validator> {
    Ok(jsonschema::validator_for(&schema())?)
}
