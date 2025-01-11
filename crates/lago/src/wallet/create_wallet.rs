use super::{Currency, Meta, WalletStatus};
use crate::LagoClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Request {
    pub currency: Currency,
    pub external_customer_id: String,
    pub rate_amount: String,
    pub expiration_at: Option<String>,
    pub granted_credits: String,
    pub invoice_requires_successful_payment: Option<bool>,
    pub name: Option<String>,
    pub paid_credits: String,
    pub recurring_transaction_rules: Option<Vec<RecurringTransactionRule>>,
    pub transaction_metadata: Option<Vec<Meta>>,
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

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum Response {
    Ok { wallet: Wallet },
    Err { status: u16, error: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Wallet {
    pub balance_cents: u64,
    pub consumed_credits: String,
    pub created_at: String,
    pub credits_balance: String,
    pub credits_ongoing_balance: String,
    pub credits_ongoing_usage_balance: String,
    pub currency: Currency,
    pub external_customer_id: String,
    pub lago_customer_id: String,
    pub lago_id: String,
    pub ongoing_balance_cents: u64,
    pub ongoing_usage_balance_cents: u64,
    pub rate_amount: String,
    pub status: WalletStatus,
    pub expiration_at: Option<String>,
    pub invoice_requires_successful_payment: Option<bool>,
    pub last_balance_sync_at: Option<String>,
    pub last_consumed_credit_at: Option<String>,
    pub name: Option<String>,
    pub recurring_transaction_rules: Option<Vec<RecurringTransactionRule>>,
    pub terminated_at: Option<String>,
}

impl LagoClient {
    // https://getlago.com/docs/api-reference/wallets/create
    pub async fn create_wallet(&self, req: Request) -> anyhow::Result<Response> {
        let mut url = self.api_base.clone();
        url.set_path("/api/v1/wallets");

        let res = self
            .client
            .post(url)
            .json(&req)
            .send()
            .await?
            .json::<Response>()
            .await?;
        Ok(res)
    }
}
