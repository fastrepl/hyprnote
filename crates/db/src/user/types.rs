use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Session {
    pub id: String,
}

pub fn register_all(collection: &mut specta_util::TypeCollection) {
    collection.register::<Session>();
}
