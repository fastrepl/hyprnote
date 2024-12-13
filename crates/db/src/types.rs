use serde::Deserialize;
use specta::{DataType, Generics, Type, TypeMap};
use sqlx::FromRow;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug)]
pub struct Json<T>(pub sqlx::types::Json<T>);

impl<T: Type> Type for Json<T> {
    fn inline(type_map: &mut TypeMap, generics: Generics) -> DataType {
        T::inline(type_map, generics)
    }
}

pub fn register_all(collection: &mut specta_util::TypeCollection) {
    collection.register::<Session>();
    collection.register::<Transcript>();
    collection.register::<TranscriptBlock>();
}

#[allow(dead_code)]
#[derive(Debug, Type, FromRow)]
pub struct Session {
    pub id: Uuid,
    pub start: OffsetDateTime,
    pub end: Option<OffsetDateTime>,
    pub tags: Vec<String>,
    pub raw_memo: String,
    pub processed_memo: String,
    pub raw_transcript: String,
}

#[allow(dead_code)]
#[derive(Debug, Type, Deserialize)]
pub struct TranscriptBlock {
    pub timestamp: OffsetDateTime,
    pub text: String,
    pub speaker: String,
}

#[allow(dead_code)]
#[derive(Debug, Type, FromRow)]
pub struct Transcript {
    pub speakers: Vec<String>,
    pub blocks: Vec<Json<TranscriptBlock>>,
}
