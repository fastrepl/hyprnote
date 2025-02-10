#[derive(
    Debug, Clone, serde::Serialize, serde::Deserialize, strum::Display, schemars::JsonSchema,
)]
pub enum Membership {
    Trial,
    Basic,
    Pro,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
pub struct Subscription {
    pub membership: Membership,
}
