use crate::LagoClient;

use super::{Currency, RecurringTransactionRule, WalletStatus};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Request {
    pub lago_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum Response {
    Ok { wallet: Wallet },
    Error { status: u16, error: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Wallet {
    pub balance_cents: u64,
    pub consumed_credits: String,
    pub created_at: String,
    pub credits_balance: String,
    pub credit_ongoing_balance: String,
    pub credits_ongoing_usage_balance: String,
    pub currency: Currency,
    pub external_customer_id: String,
    pub lago_id: String,
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
    // https://getlago.com/docs/api-reference/wallets/get-specific
    pub async fn retrieve_wallet(&self, req: Request) -> anyhow::Result<Response> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("/api/v1/wallets/{}", req.lago_id));

        let res = self
            .client
            .get(url)
            .send()
            .await?
            .json::<Response>()
            .await?;
        Ok(res)
    }
}
