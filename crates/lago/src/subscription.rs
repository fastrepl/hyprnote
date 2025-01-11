use crate::LagoClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateSubscriptionRequest {}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum CreateSubscriptionResponse {
    Ok { subscription: Subscription },
    Error { status: u16, error: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Subscription {}

impl LagoClient {
    // https://getlago.com/docs/api-reference/subscriptions/assign-plan
    pub async fn create_subscription(
        &self,
        _: CreateSubscriptionRequest,
    ) -> anyhow::Result<CreateSubscriptionResponse> {
        let url = format!("{}/subscriptions", self.api_base);
        let res = self
            .client
            .post(url)
            .send()
            .await?
            .json::<CreateSubscriptionResponse>()
            .await?;

        Ok(res)
    }
}
