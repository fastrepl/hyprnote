use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
pub struct Document {
    pub id: String,
    pub metadata: HashMap<String, Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
}

impl Document {
    pub fn new(id: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            metadata: HashMap::new(),
            body: None,
        }
    }

    pub fn with_metadata(mut self, key: impl Into<String>, value: impl Into<Value>) -> Self {
        self.metadata.insert(key.into(), value.into());
        self
    }

    pub fn with_body(mut self, body: impl Into<String>) -> Self {
        self.body = Some(body.into());
        self
    }

    pub fn get<T: serde::de::DeserializeOwned>(&self, key: &str) -> Option<T> {
        self.metadata
            .get(key)
            .and_then(|v| serde_json::from_value(v.clone()).ok())
    }

    pub fn set(&mut self, key: impl Into<String>, value: impl Into<Value>) {
        self.metadata.insert(key.into(), value.into());
    }

    pub fn remove(&mut self, key: &str) -> Option<Value> {
        self.metadata.remove(key)
    }

    pub fn rename_field(&mut self, from: &str, to: impl Into<String>) -> bool {
        if let Some(value) = self.metadata.remove(from) {
            self.metadata.insert(to.into(), value);
            true
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn document_builder() {
        let doc = Document::new("123")
            .with_metadata("name", "Alice")
            .with_metadata("age", 30)
            .with_body("Hello world");

        assert_eq!(doc.id, "123");
        assert_eq!(doc.get::<String>("name"), Some("Alice".to_string()));
        assert_eq!(doc.get::<i32>("age"), Some(30));
        assert_eq!(doc.body, Some("Hello world".to_string()));
    }

    #[test]
    fn document_rename_field() {
        let mut doc = Document::new("123").with_metadata("email", "a@b.com");

        assert!(doc.rename_field("email", "emails"));
        assert!(doc.metadata.get("email").is_none());
        assert_eq!(doc.get::<String>("emails"), Some("a@b.com".to_string()));
    }

    #[test]
    fn document_rename_nonexistent() {
        let mut doc = Document::new("123");
        assert!(!doc.rename_field("missing", "new"));
    }
}
