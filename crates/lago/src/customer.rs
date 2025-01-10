use crate::LagoClient;

pub struct CreateCustomerRequest {}
pub struct CreateCustomerResponse {}

impl LagoClient {
    // https://getlago.com/docs/api-reference/customers/create
    pub async fn create_customer(
        &self,
        _: CreateCustomerRequest,
    ) -> anyhow::Result<CreateCustomerResponse> {
        todo!()
    }
}
