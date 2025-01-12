use crate::LagoClient;

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[specta(rename = "RegenerateCheckoutUrlRequest")]
pub struct Request {
    pub external_customer_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[specta(rename = "RegenerateCheckoutUrlResponse")]
#[serde(untagged)]
pub enum Response {
    Ok { customer: ResponseCustomer },
    Error { status: u16, error: String },
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[specta(rename = "RegenerateCheckoutUrlResponseCustomer")]
pub struct ResponseCustomer {
    pub lago_customer_id: String,
    pub external_customer_id: String,
    pub payment_provider: String,
    pub checkout_url: String,
}

impl LagoClient {
    // https://docs.getlago.com/api-reference/customers/psp-checkout-url#regenerate-checkout-url
    pub async fn regenerate_checkout_url(&self, req: Request) -> anyhow::Result<Response> {
        let mut url = self.api_base.clone();
        url.set_path(&format!(
            "/api/v1/customers/{}/checkout_url",
            req.external_customer_id
        ));

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
