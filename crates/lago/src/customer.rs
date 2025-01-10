use crate::LagoClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateCustomerRequest {
    pub external_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum CreateCustomerResponse {
    Ok { customer: Customer },
    Error { status: u8, error: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Customer {
    pub external_id: String,
    pub lago_id: String,
    pub sequential_id: i64,
    pub slug: String,
    pub created_at: String,
}

impl LagoClient {
    // https://getlago.com/docs/api-reference/customers/create
    pub async fn create_customer(
        &self,
        _: CreateCustomerRequest,
    ) -> anyhow::Result<CreateCustomerResponse> {
        todo!()
    }
}
