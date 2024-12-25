use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

// All public struct must derive 'Debug, Serialize, Deserialize, specta::Type'.

#[derive(Debug, Serialize, Deserialize, specta::Type, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub created_at: OffsetDateTime,
}

impl Default for User {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4(),
            created_at: OffsetDateTime::now_utc(),
        }
    }
}
