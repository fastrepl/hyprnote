use time::OffsetDateTime;

pub struct User {
    pub id: String,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

pub struct Device {
    pub id: String,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
    pub user_id: String,
    pub fingerprint: String,
    pub api_key: String,
}
