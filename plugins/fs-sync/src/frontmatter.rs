use std::collections::HashMap;
use std::str::FromStr;

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ParsedDocument {
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub content: String,
}

pub fn deserialize(input: &str) -> std::result::Result<ParsedDocument, crate::Error> {
    match hypr_frontmatter::Document::<HashMap<String, serde_yaml::Value>>::from_str(input) {
        Ok(doc) => {
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
        Err(hypr_frontmatter::Error::MissingOpeningDelimiter) => Ok(ParsedDocument {
            frontmatter: HashMap::new(),
            content: input.to_string(),
        }),
        Err(e) => Err(e.into()),
    }
}

pub fn serialize(doc: ParsedDocument) -> std::result::Result<String, crate::Error> {
    let has_frontmatter = !doc.frontmatter.is_empty();
    let has_content = !doc.content.is_empty();

    match (has_frontmatter, has_content) {
        (false, _) => Ok(doc.content),
        (true, false) => {
            let frontmatter_yaml: HashMap<String, serde_yaml::Value> = doc
                .frontmatter
                .into_iter()
                .map(|(k, v)| {
                    let yaml_value = serde_yaml::to_value(&v).unwrap_or(serde_yaml::Value::Null);
                    (k, yaml_value)
                })
                .collect();
            let doc = hypr_frontmatter::Document::new(frontmatter_yaml, String::new());
            doc.render().map_err(crate::Error::from)
        }
        (true, true) => {
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
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_fixtures::md_with_frontmatter;

    #[test]
    fn deserialize_without_frontmatter_returns_empty_frontmatter() {
        let input = "# Meeting Summary\n\nPlain markdown.";
        let result = deserialize(input).unwrap();

        assert!(result.frontmatter.is_empty());
        assert_eq!(result.content, input);
    }

    #[test]
    fn deserialize_with_frontmatter() {
        let input = &md_with_frontmatter("id: test-id\ntype: memo", "Content here.");
        let result = deserialize(input).unwrap();

        assert_eq!(result.frontmatter["id"], "test-id");
        assert_eq!(result.frontmatter["type"], "memo");
        assert_eq!(result.content, "Content here.");
    }
}
