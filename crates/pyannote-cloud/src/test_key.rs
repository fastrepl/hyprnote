use super::PyannoteClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum Response {
    Ok { status: String, message: String },
    Error { message: String },
}

impl PyannoteClient {
    // https://docs.pyannote.ai/api-reference/test
    pub async fn test(&self) -> Result<Response, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path("/v1/test");

        let res = self
            .client
            .get(url)
            .send()
            .await?
            .json::<Response>()
            .await?;
        Ok(res)
    }
}
