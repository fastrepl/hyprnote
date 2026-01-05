use std::collections::HashMap;

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ParsedDocument {
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub content: String,
}

pub fn deserialize(input: &str) -> std::result::Result<ParsedDocument, crate::Error> {
    let doc = hypr_frontmatter::Document::<HashMap<String, serde_yaml::Value>>::from_str(input)?;

    let frontmatter_json: HashMap<String, serde_json::Value> = doc
        .frontmatter
        .into_iter()
        .map(|(k, v)| {
            let json_value = serde_json::to_value(&v).unwrap_or(serde_json::Value::Null);
            (k, json_value)
        })
        .collect();

    Ok(ParsedDocument {
        frontmatter: frontmatter_json,
        content: doc.content,
    })
}

pub fn serialize(doc: ParsedDocument) -> std::result::Result<String, crate::Error> {
    let frontmatter_yaml: HashMap<String, serde_yaml::Value> = doc
        .frontmatter
        .into_iter()
        .map(|(k, v)| {
            let yaml_value = serde_yaml::to_value(&v).unwrap_or(serde_yaml::Value::Null);
            (k, yaml_value)
        })
        .collect();

    let doc = hypr_frontmatter::Document::new(frontmatter_yaml, doc.content);
    doc.render().map_err(crate::Error::from)
}
