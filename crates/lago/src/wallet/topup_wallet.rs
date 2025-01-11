use crate::LagoClient;

use super::{
    list_wallet_transactions::WalletTransactionTransactionStatus, Meta, WalletTransactionStatus,
    WalletTransactionType,
};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Request {
    pub wallet_id: String,
    pub granted_amount: Option<String>,
    pub invoice_requires_successful_payment: Option<bool>,
    pub metadata: Option<Vec<Meta>>,
    pub paid_credits: Option<String>,
    pub voided_credits: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum Response {
    Ok {
        wallet_transactions: Vec<WalletTransaction>,
    },
    Error {
        status: u16,
        error: String,
    },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct WalletTransaction {
    pub amount: String,
    pub created_at: String,
    pub credit_amount: String,
    pub lago_id: String,
    pub lago_wallet_id: String,
    pub status: WalletTransactionStatus,
    pub transaction_status: WalletTransactionTransactionStatus,
    pub transaction_type: WalletTransactionType,
    pub invoice_requires_successful_payment: Option<bool>,
    pub metadata: Option<Vec<Meta>>,
    pub settled_at: Option<String>,
}

impl LagoClient {
    // https://getlago.com/docs/api-reference/wallets/top-up
    pub async fn top_up_wallet(&self, req: Request) -> anyhow::Result<Response> {
        let mut url = self.api_base.clone();
        url.set_path("/api/v1/wallet_transactions");

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
