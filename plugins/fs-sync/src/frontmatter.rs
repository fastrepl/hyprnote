use std::collections::HashMap;
use std::path::Path;

use rayon::prelude::*;

use crate::folder::is_uuid;

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ParsedDocument {
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub content: String,
}

pub fn deserialize(input: &str) -> std::result::Result<ParsedDocument, crate::Error> {
    let doc =
        match hypr_frontmatter::Document::<HashMap<String, serde_yaml::Value>>::from_str(input) {
            Ok(d) => d,
            Err(e) => {
                tracing::warn!("failed_to_parse_frontmatter: {}", e);
                return Ok(ParsedDocument {
                    frontmatter: HashMap::new(),
                    content: input.to_string(),
                });
            }
        };

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

pub fn read_document_from_dir(
    dir_path: &str,
) -> std::result::Result<HashMap<String, ParsedDocument>, crate::Error> {
    let path = Path::new(dir_path);
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let entries: Vec<_> = std::fs::read_dir(path)?
        .flatten()
        .filter(|entry| {
            let path = entry.path();
            if !path.is_file() {
                return false;
            }
            if path.extension().and_then(|e| e.to_str()) != Some("md") {
                return false;
            }
            path.file_stem()
                .and_then(|s| s.to_str())
                .map(is_uuid)
                .unwrap_or(false)
        })
        .collect();

    let results: Vec<_> = entries
        .into_par_iter()
        .filter_map(|entry| {
            let path = entry.path();
            let id = path.file_stem()?.to_str()?.to_string();
            let content = std::fs::read_to_string(&path).ok()?;
            let doc = deserialize(&content).ok()?;
            Some((id, doc))
        })
        .collect();

    Ok(results.into_iter().collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_fixtures::{TestEnv, UUID_1, UUID_2, md_with_frontmatter};

    #[test]
    fn read_from_nonexistent_dir_returns_empty() {
        let result = read_document_from_dir("/nonexistent/path").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn read_from_empty_dir_returns_empty() {
        let env = TestEnv::new().build();
        let result = read_document_from_dir(env.path().to_str().unwrap()).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn reads_uuid_named_md_files() {
        let env = TestEnv::new()
            .file(
                &format!("{UUID_1}.md"),
                &md_with_frontmatter("name: Alice\nage: 30", "Hello world"),
            )
            .file(
                &format!("{UUID_2}.md"),
                &md_with_frontmatter("name: Bob", "Goodbye"),
            )
            .build();

        let result = read_document_from_dir(env.path().to_str().unwrap()).unwrap();

        assert_eq!(result.len(), 2);
        assert_eq!(result[UUID_1].frontmatter["name"], "Alice");
        assert_eq!(result[UUID_1].content, "Hello world");
        assert_eq!(result[UUID_2].frontmatter["name"], "Bob");
        assert_eq!(result[UUID_2].content, "Goodbye");
    }

    #[test]
    fn skips_non_uuid_filenames() {
        let env = TestEnv::new()
            .file(
                &format!("{UUID_1}.md"),
                &md_with_frontmatter("name: Valid", "content"),
            )
            .file(
                "not-a-uuid.md",
                &md_with_frontmatter("name: Invalid", "skip"),
            )
            .file("readme.md", &md_with_frontmatter("title: Readme", "skip"))
            .build();

        let result = read_document_from_dir(env.path().to_str().unwrap()).unwrap();

        assert_eq!(result.len(), 1);
        assert!(result.contains_key(UUID_1));
    }

    #[test]
    fn skips_non_md_extensions() {
        let env = TestEnv::new()
            .file(
                &format!("{UUID_1}.md"),
                &md_with_frontmatter("name: Valid", "content"),
            )
            .file(&format!("{UUID_1}.txt"), "not md")
            .file(&format!("{UUID_1}.json"), "{}")
            .build();

        let result = read_document_from_dir(env.path().to_str().unwrap()).unwrap();

        assert_eq!(result.len(), 1);
        assert!(result.contains_key(UUID_1));
    }

    #[test]
    fn skips_directories() {
        let env = TestEnv::new()
            .file(
                &format!("{UUID_1}.md"),
                &md_with_frontmatter("name: File", "content"),
            )
            .folder(UUID_2)
            .done()
            .build();

        let result = read_document_from_dir(env.path().to_str().unwrap()).unwrap();

        assert_eq!(result.len(), 1);
        assert!(result.contains_key(UUID_1));
    }

    #[test]
    fn deserialize_without_frontmatter() {
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
