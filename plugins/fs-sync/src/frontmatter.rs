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

pub fn read_frontmatter_from_dir(
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
    use std::fs;

    fn create_md_file(dir: &Path, filename: &str, frontmatter: &str, content: &str) {
        let path = dir.join(filename);
        let file_content = format!("---\n{}\n---\n{}", frontmatter, content);
        fs::write(path, file_content).unwrap();
    }

    #[test]
    fn test_read_frontmatter_from_dir_nonexistent() {
        let result = read_frontmatter_from_dir("/nonexistent/path").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_read_frontmatter_from_dir_empty() {
        let temp = tempfile::tempdir().unwrap();
        let result = read_frontmatter_from_dir(temp.path().to_str().unwrap()).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_read_frontmatter_from_dir_with_files() {
        let temp = tempfile::tempdir().unwrap();
        let uuid1 = "550e8400-e29b-41d4-a716-446655440000";
        let uuid2 = "550e8400-e29b-41d4-a716-446655440001";

        create_md_file(
            temp.path(),
            &format!("{}.md", uuid1),
            "name: Alice\nage: 30",
            "Hello world",
        );
        create_md_file(
            temp.path(),
            &format!("{}.md", uuid2),
            "name: Bob",
            "Goodbye",
        );

        let result = read_frontmatter_from_dir(temp.path().to_str().unwrap()).unwrap();

        assert_eq!(result.len(), 2);
        assert!(result.contains_key(uuid1));
        assert!(result.contains_key(uuid2));

        let doc1 = &result[uuid1];
        assert_eq!(doc1.frontmatter["name"], "Alice");
        assert_eq!(doc1.content, "Hello world");

        let doc2 = &result[uuid2];
        assert_eq!(doc2.frontmatter["name"], "Bob");
        assert_eq!(doc2.content, "Goodbye");
    }

    #[test]
    fn test_read_frontmatter_from_dir_skips_non_uuid() {
        let temp = tempfile::tempdir().unwrap();
        let uuid = "550e8400-e29b-41d4-a716-446655440000";

        create_md_file(
            temp.path(),
            &format!("{}.md", uuid),
            "name: Valid",
            "content",
        );
        create_md_file(temp.path(), "not-a-uuid.md", "name: Invalid", "should skip");
        create_md_file(temp.path(), "readme.md", "title: Readme", "also skip");

        let result = read_frontmatter_from_dir(temp.path().to_str().unwrap()).unwrap();

        assert_eq!(result.len(), 1);
        assert!(result.contains_key(uuid));
    }

    #[test]
    fn test_read_frontmatter_from_dir_skips_non_md() {
        let temp = tempfile::tempdir().unwrap();
        let uuid = "550e8400-e29b-41d4-a716-446655440000";

        create_md_file(
            temp.path(),
            &format!("{}.md", uuid),
            "name: Valid",
            "content",
        );
        fs::write(temp.path().join(format!("{}.txt", uuid)), "not markdown").unwrap();
        fs::write(temp.path().join(format!("{}.json", uuid)), "{}").unwrap();

        let result = read_frontmatter_from_dir(temp.path().to_str().unwrap()).unwrap();

        assert_eq!(result.len(), 1);
        assert!(result.contains_key(uuid));
    }

    #[test]
    fn test_read_frontmatter_from_dir_skips_directories() {
        let temp = tempfile::tempdir().unwrap();
        let uuid = "550e8400-e29b-41d4-a716-446655440000";
        let uuid_dir = "550e8400-e29b-41d4-a716-446655440001";

        create_md_file(
            temp.path(),
            &format!("{}.md", uuid),
            "name: File",
            "content",
        );
        fs::create_dir(temp.path().join(uuid_dir)).unwrap();

        let result = read_frontmatter_from_dir(temp.path().to_str().unwrap()).unwrap();

        assert_eq!(result.len(), 1);
        assert!(result.contains_key(uuid));
    }

    #[test]
    fn test_deserialize_without_frontmatter() {
        let input = "# Meeting Summary\n\nThis is plain markdown without frontmatter.";
        let result = super::deserialize(input).unwrap();

        assert!(result.frontmatter.is_empty());
        assert_eq!(result.content, input);
    }

    #[test]
    fn test_deserialize_with_frontmatter() {
        let input = "---\nid: test-id\ntype: memo\n---\n\nContent here.";
        let result = super::deserialize(input).unwrap();

        assert_eq!(result.frontmatter["id"], "test-id");
        assert_eq!(result.frontmatter["type"], "memo");
        assert_eq!(result.content, "Content here.");
    }
}
