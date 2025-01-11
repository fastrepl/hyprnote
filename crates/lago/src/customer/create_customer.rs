use crate::LagoClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Request {
    pub external_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum Response {
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
    pub async fn create_customer(&self, req: Request) -> anyhow::Result<Response> {
        let mut url = self.api_base.clone();
        url.set_path("/api/v1/customers");

        let response = self
            .client
            .post(url)
            .json(&req)
            .send()
            .await?
            .json::<Response>()
            .await?;
        Ok(response)
    }
}
