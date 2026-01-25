use std::{collections::HashMap, str::FromStr};

use hypr_frontmatter::{Document, Error as FrontmatterError};

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ParsedDocument {
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub content: String,
}

fn yaml_to_json(yaml: serde_yaml::Value) -> serde_json::Value {
    match yaml {
        serde_yaml::Value::Null => serde_json::Value::Null,
        serde_yaml::Value::Bool(b) => serde_json::Value::Bool(b),
        serde_yaml::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                serde_json::Value::Number(i.into())
            } else if let Some(u) = n.as_u64() {
                serde_json::Value::Number(u.into())
            } else if let Some(f) = n.as_f64() {
                serde_json::Number::from_f64(f)
                    .map(serde_json::Value::Number)
                    .unwrap_or(serde_json::Value::Null)
            } else {
                serde_json::Value::Null
            }
        }
        serde_yaml::Value::String(s) => serde_json::Value::String(s),
        serde_yaml::Value::Sequence(seq) => {
            serde_json::Value::Array(seq.into_iter().map(yaml_to_json).collect())
        }
        serde_yaml::Value::Mapping(map) => {
            let obj: serde_json::Map<String, serde_json::Value> = map
                .into_iter()
                .filter_map(|(k, v)| {
                    let key = match k {
                        serde_yaml::Value::String(s) => s,
                        other => serde_yaml::to_string(&other).ok()?.trim().to_string(),
                    };
                    Some((key, yaml_to_json(v)))
                })
                .collect();
            serde_json::Value::Object(obj)
        }
        serde_yaml::Value::Tagged(tagged) => yaml_to_json(tagged.value),
    }
}

impl FromStr for ParsedDocument {
    type Err = crate::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match Document::<HashMap<String, serde_yaml::Value>>::from_str(s) {
            Ok(doc) => {
                let frontmatter: HashMap<String, serde_json::Value> = doc
                    .frontmatter
                    .into_iter()
                    .map(|(k, v)| (k, yaml_to_json(v)))
                    .collect();

                Ok(ParsedDocument {
                    frontmatter,
                    content: doc.content,
                })
            }
            Err(FrontmatterError::MissingOpeningDelimiter) => Ok(ParsedDocument {
                frontmatter: HashMap::new(),
                content: s.to_string(),
            }),
            Err(e) => Err(e.into()),
        }
    }
}

impl ParsedDocument {
    pub fn render(&self) -> Result<String, crate::Error> {
        if self.frontmatter.is_empty() {
            return Ok(self.content.clone());
        }

        let frontmatter_yaml: HashMap<String, serde_yaml::Value> = self
            .frontmatter
            .iter()
            .map(|(k, v)| {
                let yaml_value = serde_yaml::to_value(v).unwrap_or(serde_yaml::Value::Null);
                (k.clone(), yaml_value)
            })
            .collect();

        let doc = Document::new(frontmatter_yaml, &self.content);
        doc.render().map_err(crate::Error::from)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_fixtures::md_with_frontmatter;

    #[test]
    fn parse_without_frontmatter_returns_empty() {
        let input = "# Meeting Summary\n\nPlain markdown.";
        let result = ParsedDocument::from_str(input).unwrap();

        assert!(result.frontmatter.is_empty());
        assert_eq!(result.content, input);
    }

    #[test]
    fn parse_with_frontmatter() {
        let input = &md_with_frontmatter("id: test-id\ntype: memo", "Content here.");
        let result = ParsedDocument::from_str(input).unwrap();

        assert_eq!(result.frontmatter["id"], "test-id");
        assert_eq!(result.frontmatter["type"], "memo");
        assert_eq!(result.content, "Content here.");
    }

    #[test]
    fn render_roundtrip() {
        let input = &md_with_frontmatter("id: test-id\ntype: memo", "Content here.");
        let parsed = ParsedDocument::from_str(input).unwrap();
        let rendered = parsed.render().unwrap();
        let reparsed = ParsedDocument::from_str(&rendered).unwrap();

        assert_eq!(parsed, reparsed);
    }
}
