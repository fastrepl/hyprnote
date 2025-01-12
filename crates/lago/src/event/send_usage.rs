use crate::LagoClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Request {
    pub code: String,
    pub external_subscription_id: String,
    pub transaction_id: String,
    pub precise_total_amount_cents: Option<String>,
    pub properties: std::collections::HashMap<String, serde_json::Value>,
    pub timestamp: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum Response {
    Ok { event: Event },
    Error { status: u16, message: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Event {
    pub code: String,
    pub external_subscription_id: String,
    pub transaction_id: String,
    pub precise_total_amount_cents: Option<String>,
    pub properties: std::collections::HashMap<String, serde_json::Value>,
    pub timestamp: String,
    pub created_at: String,
    pub lago_id: String,
    pub lago_customer_id: String,
    pub lago_subscription_id: String,
}

impl LagoClient {
    // https://getlago.com/docs/api-reference/events/usage
    pub async fn send_usage_event(&self, req: Request) -> anyhow::Result<Response> {
        let mut url = self.api_base.clone();
        url.set_path("/api/v1/events");

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
