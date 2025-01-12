use crate::LagoClient;

use super::SubscriptionStatus;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Request {
    pub subscription: RequestSubscription,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct RequestSubscription {
    pub external_customer_id: String,
    pub external_id: String,
    pub plan_code: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum Response {
    Ok { subscription: ResponseSubscription },
    Error { status: u16, error: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ResponseSubscription {
    pub status: SubscriptionStatus,
}

impl LagoClient {
    // https://getlago.com/docs/api-reference/subscriptions/assign-plan
    pub async fn create_subscription(&self, req: Request) -> anyhow::Result<Response> {
        let mut url = self.api_base.clone();
        url.set_path("/api/v1/subscriptions");

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
