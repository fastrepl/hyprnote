use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_yaml::Value;
use thiserror::Error;

const DELIMITER: &str = "---";

#[derive(Error, Debug)]
pub enum Error {
    #[error("missing opening delimiter")]
    MissingOpeningDelimiter,
    #[error("missing closing delimiter")]
    MissingClosingDelimiter,
    #[error("failed to parse YAML frontmatter: {0}")]
    YamlParse(#[from] serde_yaml::Error),
}

fn sort_value(value: Value) -> Value {
    match value {
        Value::Mapping(mapping) => {
            let mut entries: Vec<_> = mapping.into_iter().collect();
            entries.sort_by(|(a, _), (b, _)| {
                let a_str = value_to_sort_key(a);
                let b_str = value_to_sort_key(b);
                a_str.cmp(&b_str)
            });
            let mut sorted = serde_yaml::Mapping::new();
            for (k, v) in entries {
                sorted.insert(k, sort_value(v));
            }
            Value::Mapping(sorted)
        }
        Value::Sequence(seq) => Value::Sequence(seq.into_iter().map(sort_value).collect()),
        other => other,
    }
}

fn value_to_sort_key(value: &Value) -> String {
    match value {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => String::new(),
        _ => serde_yaml::to_string(value).unwrap_or_default(),
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Document<T> {
    pub frontmatter: T,
    pub content: String,
}

impl<T> Document<T> {
    pub fn new(frontmatter: T, content: impl Into<String>) -> Self {
        Self {
            frontmatter,
            content: content.into(),
        }
    }
}

impl<T: DeserializeOwned> Document<T> {
    pub fn from_str(s: &str) -> Result<Self, Error> {
        let s = s.trim_start();

        if !s.starts_with(DELIMITER) {
            return Err(Error::MissingOpeningDelimiter);
        }

        let after_opening = &s[DELIMITER.len()..];
        let after_opening = after_opening.strip_prefix('\n').unwrap_or(after_opening);

        let closing_pos = after_opening
            .find(&format!("\n{}", DELIMITER))
            .or_else(|| {
                if after_opening.starts_with(DELIMITER) {
                    Some(0)
                } else {
                    None
                }
            })
            .ok_or(Error::MissingClosingDelimiter)?;

        let yaml_str = &after_opening[..closing_pos];
        let after_closing = &after_opening[closing_pos..];
        let after_closing = after_closing
            .strip_prefix('\n')
            .unwrap_or(after_closing)
            .strip_prefix(DELIMITER)
            .unwrap_or(after_closing);

        let frontmatter: T = if yaml_str.trim().is_empty() {
            serde_yaml::from_str("{}")?
        } else {
            serde_yaml::from_str(yaml_str)?
        };

        let content = after_closing
            .strip_prefix('\n')
            .unwrap_or(after_closing)
            .strip_prefix('\n')
            .unwrap_or(after_closing)
            .to_string();

        Ok(Document {
            frontmatter,
            content,
        })
    }
}

impl<T: Serialize> Document<T> {
    pub fn to_string(&self) -> Result<String, Error> {
        let value = serde_yaml::to_value(&self.frontmatter)?;
        let sorted = sort_value(value);
        let yaml = serde_yaml::to_string(&sorted)?;
        let mut output = String::new();
        output.push_str(DELIMITER);
        output.push('\n');
        output.push_str(&yaml);
        output.push_str(DELIMITER);
        output.push_str("\n\n");
        output.push_str(&self.content);
        Ok(output)
    }
}

impl<T: Serialize> Serialize for Document<T> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let s = self.to_string().map_err(serde::ser::Error::custom)?;
        serializer.serialize_str(&s)
    }
}

impl<'de, T: DeserializeOwned> Deserialize<'de> for Document<T> {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Document::from_str(&s).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    struct TestFrontmatter {
        title: String,
        #[serde(default)]
        tags: Vec<String>,
    }

    #[test]
    fn test_parse_basic() {
        let input = r#"---
title: Hello World
tags:
  - rust
  - serde
---

This is the content."#;

        let doc: Document<TestFrontmatter> = Document::from_str(input).unwrap();
        assert_eq!(doc.frontmatter.title, "Hello World");
        assert_eq!(doc.frontmatter.tags, vec!["rust", "serde"]);
        assert_eq!(doc.content, "This is the content.");
    }

    #[test]
    fn test_parse_empty_frontmatter() {
        let input = r#"---
---

Content here."#;

        let doc: Document<HashMap<String, String>> = Document::from_str(input).unwrap();
        assert!(doc.frontmatter.is_empty());
        assert_eq!(doc.content, "Content here.");
    }

    #[test]
    fn test_parse_content_with_dashes() {
        let input = r#"---
title: Test
---

Some content with --- dashes in the middle.
And another --- line."#;

        let doc: Document<TestFrontmatter> = Document::from_str(input).unwrap();
        assert_eq!(doc.frontmatter.title, "Test");
        assert!(doc.content.contains("--- dashes"));
        assert!(doc.content.contains("--- line"));
    }

    #[test]
    fn test_parse_missing_opening_delimiter() {
        let input = "No frontmatter here";
        let result: Result<Document<TestFrontmatter>, _> = Document::from_str(input);
        assert!(matches!(result, Err(Error::MissingOpeningDelimiter)));
    }

    #[test]
    fn test_parse_missing_closing_delimiter() {
        let input = r#"---
title: Test
No closing delimiter"#;

        let result: Result<Document<TestFrontmatter>, _> = Document::from_str(input);
        assert!(matches!(result, Err(Error::MissingClosingDelimiter)));
    }

    #[test]
    fn test_serialize_basic() {
        let doc = Document::new(
            TestFrontmatter {
                title: "My Title".to_string(),
                tags: vec!["tag1".to_string()],
            },
            "Content goes here.",
        );

        let output = doc.to_string().unwrap();
        assert!(output.starts_with("---\n"));
        assert!(output.contains("title: My Title"));
        assert!(output.contains("tags:"));
        assert!(output.contains("- tag1"));
        assert!(output.ends_with("Content goes here."));
    }

    #[test]
    fn test_roundtrip() {
        let original = Document::new(
            TestFrontmatter {
                title: "Roundtrip Test".to_string(),
                tags: vec!["a".to_string(), "b".to_string()],
            },
            "Some content.\n\nWith multiple paragraphs.",
        );

        let serialized = original.to_string().unwrap();
        let parsed: Document<TestFrontmatter> = Document::from_str(&serialized).unwrap();

        assert_eq!(original.frontmatter, parsed.frontmatter);
        assert_eq!(original.content, parsed.content);
    }

    #[test]
    fn test_serde_integration() {
        let doc = Document::new(
            TestFrontmatter {
                title: "Serde Test".to_string(),
                tags: vec![],
            },
            "Content",
        );

        let json = serde_json::to_string(&doc).unwrap();
        let parsed: Document<TestFrontmatter> = serde_json::from_str(&json).unwrap();

        assert_eq!(doc.frontmatter.title, parsed.frontmatter.title);
        assert_eq!(doc.content, parsed.content);
    }

    #[test]
    fn test_hashmap_frontmatter() {
        let mut fm = HashMap::new();
        fm.insert("key1".to_string(), "value1".to_string());
        fm.insert("key2".to_string(), "value2".to_string());

        let doc = Document::new(fm, "Content with HashMap frontmatter");
        let serialized = doc.to_string().unwrap();
        let parsed: Document<HashMap<String, String>> = Document::from_str(&serialized).unwrap();

        assert_eq!(parsed.frontmatter.get("key1"), Some(&"value1".to_string()));
        assert_eq!(parsed.frontmatter.get("key2"), Some(&"value2".to_string()));
    }

    #[test]
    fn test_whitespace_handling() {
        let input = "   ---\ntitle: Whitespace\n---\n\nContent";
        let doc: Document<TestFrontmatter> = Document::from_str(input).unwrap();
        assert_eq!(doc.frontmatter.title, "Whitespace");
    }

    #[test]
    fn test_sorted_keys() {
        let mut fm1 = HashMap::new();
        fm1.insert("zebra".to_string(), "last".to_string());
        fm1.insert("apple".to_string(), "first".to_string());
        fm1.insert("mango".to_string(), "middle".to_string());

        let mut fm2 = HashMap::new();
        fm2.insert("apple".to_string(), "first".to_string());
        fm2.insert("mango".to_string(), "middle".to_string());
        fm2.insert("zebra".to_string(), "last".to_string());

        let doc1 = Document::new(fm1, "Content");
        let doc2 = Document::new(fm2, "Content");

        let output1 = doc1.to_string().unwrap();
        let output2 = doc2.to_string().unwrap();

        assert_eq!(
            output1, output2,
            "Keys should be sorted alphabetically regardless of insertion order"
        );

        assert!(output1.find("apple").unwrap() < output1.find("mango").unwrap());
        assert!(output1.find("mango").unwrap() < output1.find("zebra").unwrap());
    }

    #[test]
    fn test_nested_sorted_keys() {
        #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
        struct Nested {
            inner: HashMap<String, String>,
            name: String,
        }

        let mut inner = HashMap::new();
        inner.insert("z_key".to_string(), "z_value".to_string());
        inner.insert("a_key".to_string(), "a_value".to_string());

        let doc = Document::new(
            Nested {
                inner,
                name: "test".to_string(),
            },
            "Content",
        );

        let output = doc.to_string().unwrap();

        assert!(output.find("a_key").unwrap() < output.find("z_key").unwrap());
        assert!(output.find("inner").unwrap() < output.find("name").unwrap());
    }
}
