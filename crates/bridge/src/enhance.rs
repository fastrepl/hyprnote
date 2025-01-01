// https://platform.openai.com/docs/guides/structured-outputs
// https://tiptap.dev/docs/guides/output-json-html#option-1-json
pub fn schema() -> serde_json::Value {
    serde_json::json!({
      "type": "object",
      "title": "editor_state",
      "properties": {
        "type": {
          "type": ["string", "null"],
          "description": "The node type (e.g. 'doc', 'paragraph', 'text', etc.)"
        },
        "attrs": {
          "type": ["object", "null"],
          "description": "Arbitrary attributes for this node",
          "properties": {},
          "additionalProperties": false
        },
        "content": {
          "type": ["array", "null"],
          "description": "Recursive nested content",
          "items": {
            "$ref": "#"
          }
        },
        "marks": {
          "type": ["array", "null"],
          "description": "List of mark definitions for this node",
          "items": {
            "type": "object",
            "title": "Mark",
            "properties": {
              "type": {
                "type": ["string", "null"],
                "description": "Mark type (e.g. 'bold', 'italic', etc.)"
              },
              "attrs": {
                "type": ["object", "null"],
                "description": "Arbitrary attributes for the mark",
                "properties": {},
                "additionalProperties": false
              }
            },
            "required": ["type", "attrs"],
            "additionalProperties": false
          }
        },
        "text": {
          "type": ["string", "null"],
          "description": "Text content for text nodes"
        }
      },
      "required": ["type", "attrs", "content", "marks", "text"],
       "additionalProperties": false
    })
}

pub fn validator() -> anyhow::Result<jsonschema::Validator> {
    Ok(jsonschema::validator_for(&schema())?)
}
