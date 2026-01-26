use serde::{Deserialize, Serialize};
use specta::Type;

#[allow(dead_code)]
pub mod v1 {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Participant {
        pub id: String,
        pub user_id: String,
        pub created_at: String,
        pub session_id: String,
        pub human_id: String,
        pub source: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct SessionMeta {
        pub id: String,
        pub user_id: String,
        pub created_at: String,
        pub title: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub event_id: Option<String>,
        #[serde(default)]
        pub participants: Vec<Participant>,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        pub tags: Vec<String>,
    }

    impl SessionMeta {
        pub fn migrate(self) -> super::v2::SessionMeta {
            super::v2::SessionMeta {
                id: self.id,
                user_id: self.user_id,
                created_at: self.created_at,
                title: self.title,
                event_id: self.event_id,
                participants: self
                    .participants
                    .into_iter()
                    .map(|p| super::v2::Participant {
                        id: p.id,
                        user_id: p.user_id,
                        created_at: p.created_at,
                        session_id: p.session_id,
                        human_id: p.human_id,
                        source: p.source,
                    })
                    .collect(),
                tags: self.tags,
                schema_version: 1,
            }
        }
    }
}

pub mod v2 {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize, Type)]
    pub struct Participant {
        pub id: String,
        pub user_id: String,
        pub created_at: String,
        pub session_id: String,
        pub human_id: String,
        pub source: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, Type)]
    pub struct SessionMeta {
        pub id: String,
        pub user_id: String,
        pub created_at: String,
        pub title: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub event_id: Option<String>,
        #[serde(default)]
        pub participants: Vec<Participant>,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        pub tags: Vec<String>,
        #[serde(rename = "_schema_version")]
        pub schema_version: u32,
    }
}

pub use v2::SessionMeta;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrate_v1_to_v2() {
        let v1_meta = v1::SessionMeta {
            id: "test-id".to_string(),
            user_id: "local".to_string(),
            created_at: "2026-01-25T00:00:00Z".to_string(),
            title: "Test Session".to_string(),
            event_id: None,
            participants: vec![],
            tags: vec![],
        };

        let v2_meta = v1_meta.migrate();
        assert_eq!(v2_meta.id, "test-id");
        assert_eq!(v2_meta.schema_version, 1);
    }

    #[test]
    fn deserialize_v1_json() {
        let json = r#"{
            "id": "test-id",
            "user_id": "local",
            "created_at": "2026-01-25T00:00:00Z",
            "title": "Test Session",
            "participants": []
        }"#;

        let meta: v1::SessionMeta = serde_json::from_str(json).unwrap();
        assert_eq!(meta.id, "test-id");
    }

    #[test]
    fn deserialize_v2_json() {
        let json = r#"{
            "id": "test-id",
            "user_id": "local",
            "created_at": "2026-01-25T00:00:00Z",
            "title": "Test Session",
            "participants": [],
            "_schema_version": 1
        }"#;

        let meta: v2::SessionMeta = serde_json::from_str(json).unwrap();
        assert_eq!(meta.id, "test-id");
        assert_eq!(meta.schema_version, 1);
    }
}
