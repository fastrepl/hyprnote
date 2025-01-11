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

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct RecurringTransactionRule {
    pub trigger: RecurringTransactionTrigger,
    pub granted_credits: String,
    pub interval: RecurringTransactionInterval,
    pub invoice_requires_successful_payment: Option<bool>,
    pub method: RecurringTransactionMethod,
    pub paid_credits: String,
    pub started_at: Option<String>,
    pub target_ongoing_balance: Option<String>,
    pub threshold_credits: Option<String>,
    pub transaction_metadata: Option<Vec<Meta>>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum RecurringTransactionMethod {
    #[serde(rename = "fixed")]
    Fixed,
    #[serde(rename = "target")]
    Target,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum RecurringTransactionTrigger {
    #[serde(rename = "interval")]
    Interval,
    #[serde(rename = "threshold")]
    Threshold,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum RecurringTransactionInterval {
    #[serde(rename = "weekly")]
    Weekly,
    #[serde(rename = "monthly")]
    Monthly,
    #[serde(rename = "quarterly")]
    Quarterly,
    #[serde(rename = "yearly")]
    Yearly,
}
