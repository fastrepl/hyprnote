use crate::LagoClient;

pub struct CreateSubscriptionRequest {}
pub struct CreateSubscriptionResponse {}

impl LagoClient {
    // https://getlago.com/docs/api-reference/subscriptions/assign-plan
    pub async fn create_subscription(
        &self,
        _: CreateSubscriptionRequest,
    ) -> anyhow::Result<CreateSubscriptionResponse> {
        todo!()
    }
}
