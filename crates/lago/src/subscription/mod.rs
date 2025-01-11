pub mod create_subscription;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum SubscriptionStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "terminated")]
    Terminated,
    #[serde(rename = "canceled")]
    Canceled,
}
