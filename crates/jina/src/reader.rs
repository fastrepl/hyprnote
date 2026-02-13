use crate::client::{JinaClient, check_response};
use crate::common_derives;

common_derives! {
    pub struct ReadUrlRequest {
        #[schemars(description = "The URL to read and convert to markdown")]
        pub url: String,
    }
}

impl JinaClient {
    pub async fn read_url(&self, req: ReadUrlRequest) -> Result<String, crate::Error> {
        let url = format!("https://r.jina.ai/{}", req.url);

        let response = self.client.get(&url).send().await?;
        let response = check_response(response).await?;
        Ok(response.text().await?)
    }
}
