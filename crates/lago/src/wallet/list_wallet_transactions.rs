use crate::LagoClient;

use super::{WalletTransactionSource, WalletTransactionStatus, WalletTransactionType};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Request {
    pub lago_id: String,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub status: Option<WalletTransactionStatus>,
    pub transaction_status: Option<WalletTransactionTransactionStatus>,
    pub transaction_type: Option<WalletTransactionType>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum Response {
    Ok {
        #[serde(rename = "meta")]
        pagination: Pagination,
        wallet_transactions: Vec<WalletTransaction>,
    },
    Error {
        status: u16,
        message: String,
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
    pub invoice_requires_successful_payment: bool,
    pub metadata: std::collections::HashMap<String, serde_json::Value>,
    pub settled_at: String,
    pub source: WalletTransactionSource,
}

#[derive(Debug, strum::AsRefStr, serde::Serialize, serde::Deserialize)]
pub enum WalletTransactionTransactionStatus {
    #[serde(rename = "purchased")]
    #[strum(serialize = "purchased")]
    Purchased,
    #[serde(rename = "granted")]
    #[strum(serialize = "granted")]
    Granted,
    #[serde(rename = "voided")]
    #[strum(serialize = "voided")]
    Voided,
    #[serde(rename = "invoiced")]
    #[strum(serialize = "invoiced")]
    Invoiced,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Pagination {
    pub current_page: u64,
    pub total_count: u64,
    pub total_pages: u64,
    pub next_page: Option<u64>,
    pub prev_page: Option<u64>,
}

impl LagoClient {
    // https://getlago.com/docs/api-reference/wallets/get-all-transactions
    pub async fn list_wallet_transactions(&self, req: Request) -> anyhow::Result<Response> {
        let mut url = self.api_base.clone();
        url.set_path(&format!(
            "/api/v1/wallets/{}/wallet_transactions",
            req.lago_id
        ));

        {
            let mut pairs = url.query_pairs_mut();

            if let Some(page) = req.page {
                pairs.append_pair("page", &page.to_string());
            }
            if let Some(per_page) = req.per_page {
                pairs.append_pair("per_page", &per_page.to_string());
            }
            if let Some(status) = req.status {
                pairs.append_pair("status", status.as_ref());
            }
            if let Some(transaction_status) = req.transaction_status {
                pairs.append_pair("transaction_status", transaction_status.as_ref());
            }
            if let Some(transaction_type) = req.transaction_type {
                pairs.append_pair("transaction_type", transaction_type.as_ref());
            }
        }

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
