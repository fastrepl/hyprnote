use crate::LagoClient;

pub struct SendUsageEventRequest {}
pub struct SendUsageEventResponse {}

impl LagoClient {
    // https://getlago.com/docs/api-reference/events/usage
    pub async fn send_usage_event(
        &self,
        _: SendUsageEventRequest,
    ) -> anyhow::Result<SendUsageEventResponse> {
        todo!()
    }
}
