use specta::Type;
use time::OffsetDateTime;
use uuid::Uuid;

pub fn register_all(collection: &mut specta_util::TypeCollection) {
    collection.register::<Session>();
}

#[allow(dead_code)]
#[derive(Type)]
pub struct Session {
    id: Uuid,
    // RFC3339
    created_at: OffsetDateTime,
    // RFC3339
    ended_at: Option<OffsetDateTime>,
}
