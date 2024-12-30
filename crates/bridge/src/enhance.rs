use crate::{Client, EnhanceInput, EnhanceOutput};
use anyhow::Result;

impl Client {
    pub async fn enhance(&self, input: EnhanceInput) -> Result<EnhanceOutput> {
        let mut url = self.base.clone();
        url.set_path("/api/native/enhance");

        let response = self
            .reqwest_client
            .post(url.to_string())
            .json(&input)
            .send()
            .await?;

        Ok(response.json().await?)
    }
}
