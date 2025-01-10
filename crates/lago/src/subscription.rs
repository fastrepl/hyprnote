use crate::LagoClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateSubscriptionRequest {}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateSubscriptionResponse {}

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
