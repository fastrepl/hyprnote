pub mod external;
pub mod internal;

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize, specta::Type,
)]
pub enum ServerType {
    #[serde(rename = "internal")]
    Internal,
    #[serde(rename = "external")]
    External,
}
