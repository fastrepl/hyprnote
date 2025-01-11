use crate::LagoClient;

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
    pub lago_id: String,
    pub currency: String,
    pub external_customer_id: String,
    pub rate_amount: u64,
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
