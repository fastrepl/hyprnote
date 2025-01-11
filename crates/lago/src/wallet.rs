use crate::LagoClient;

pub type CreateWalletRequest = Wallet;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum CreateWalletResponse {
    Ok { wallet: Wallet },
    Error { status: u16, error: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct RetrieveWalletRequest {
    pub lago_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum RetrieveWalletResponse {
    Ok { wallet: Wallet },
    Error { status: u16, error: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TopUpWalletRequest {}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TopUpWalletResponse {}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ListWalletTransactionsRequest {
    pub lago_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum ListWalletTransactionsResponse {
    Ok {
        meta: ListWalletTransactionMeta,
        wallet_transactions: Vec<WalletTransaction>,
    },
    Error {
        status: u16,
        message: String,
    },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ListWalletTransactionMeta {
    pub current_page: u64,
    pub total_count: u64,
    pub total_pages: u64,
    pub next_page: Option<u64>,
    pub prev_page: Option<u64>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct WalletTransaction {
    pub amount: String,
    pub created_at: String,
    pub credit_amount: String,
    pub lago_id: String,
    pub lago_wallet_id: String,
    pub status: WalletTransactionStatus,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Wallet {
    pub lago_id: String,
    pub currency: String,
    pub external_customer_id: String,
    pub rate_amount: u64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum WalletTransactionStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "settled")]
    Settled,
}

impl LagoClient {
    // https://getlago.com/docs/api-reference/wallets/create
    pub async fn create_wallet(
        &self,
        _: CreateWalletRequest,
    ) -> anyhow::Result<CreateWalletResponse> {
        todo!()
    }

    // https://getlago.com/docs/api-reference/wallets/get-specific
    pub async fn retrieve_wallet(
        &self,
        _: RetrieveWalletRequest,
    ) -> anyhow::Result<RetrieveWalletResponse> {
        todo!()
    }

    // https://getlago.com/docs/api-reference/wallets/top-up
    pub async fn top_up_wallet(
        &self,
        _: TopUpWalletRequest,
    ) -> anyhow::Result<TopUpWalletResponse> {
        todo!()
    }

    pub async fn list_wallet_transactions(
        &self,
        _: ListWalletTransactionsRequest,
    ) -> anyhow::Result<ListWalletTransactionsResponse> {
        todo!()
    }
}
