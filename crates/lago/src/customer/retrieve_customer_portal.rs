use crate::LagoClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Request {
    pub external_customer_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum Response {
    Ok { customer: ResponseCustomer },
    Error { status: u16, error: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ResponseCustomer {
    pub portal_url: String,
}

impl LagoClient {
    // https://getlago.com/docs/api-reference/customers/customer-portal
    pub async fn retrieve_customer_portal(&self, req: Request) -> anyhow::Result<Response> {
        let mut url = self.api_base.clone();
        url.set_path(&format!(
            "/api/v1/customers/{}/portal_url",
            req.external_customer_id
        ));

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
