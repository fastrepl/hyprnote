use crate::LagoClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateCustomerRequest {
    pub external_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum CreateCustomerResponse {
    Ok { customer: Customer },
    Error { status: u16, error: String },
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
        req: CreateCustomerRequest,
    ) -> anyhow::Result<CreateCustomerResponse> {
        let url = format!("{}/api/v1/customers", self.api_base);
        let response = self
            .client
            .post(url)
            .json(&req)
            .send()
            .await?
            .json::<CreateCustomerResponse>()
            .await?;
        Ok(response)
    }
}
