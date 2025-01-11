pub mod create_wallet;
pub mod list_wallet_transactions;
pub mod retrieve_wallet;
pub mod topup_wallet;

#[derive(Debug, strum::AsRefStr, serde::Serialize, serde::Deserialize)]
pub enum WalletStatus {
    #[strum(serialize = "active")]
    #[serde(rename = "active")]
    Active,
    #[strum(serialize = "terminated")]
    #[serde(rename = "terminated")]
    Terminated,
}

#[derive(Debug, strum::AsRefStr, strum::Display, serde::Serialize, serde::Deserialize)]
pub enum WalletTransactionSource {
    #[strum(serialize = "manual")]
    #[serde(rename = "manual")]
    Manual,
    #[strum(serialize = "interval")]
    #[serde(rename = "interval")]
    Interval,
    #[strum(serialize = "threshold")]
    #[serde(rename = "threshold")]
    Threshold,
}

#[derive(Debug, strum::AsRefStr, serde::Serialize, serde::Deserialize)]
pub enum WalletTransactionType {
    #[serde(rename = "inbound")]
    #[strum(serialize = "inbound")]
    Inbound,
    #[serde(rename = "outbound")]
    #[strum(serialize = "outbound")]
    Outbound,
}

#[derive(Debug, strum::AsRefStr, serde::Serialize, serde::Deserialize)]
pub enum WalletTransactionStatus {
    #[strum(serialize = "pending")]
    #[serde(rename = "pending")]
    Pending,
    #[strum(serialize = "settled")]
    #[serde(rename = "settled")]
    Settled,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum Currency {
    #[serde(rename = "EUR")]
    EUR,
    #[serde(rename = "USD")]
    USD,
    #[serde(rename = "KRW")]
    KRW,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Meta {
    pub key: String,
    pub value: String,
}
