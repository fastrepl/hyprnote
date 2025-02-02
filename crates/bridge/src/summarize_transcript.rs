use crate::{Client, Error, SummarizeTranscriptRequest, SummarizeTranscriptResponse};

impl Client {
    pub async fn summarize_transcript(
        &self,
        req: SummarizeTranscriptRequest,
    ) -> Result<SummarizeTranscriptResponse, Error> {
        let mut url = self.api_base.clone();
        url.set_path("/api/native/summarize");

        let res = self
            .reqwest_client
            .post(url)
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .header(reqwest::header::ACCEPT, "application/json")
            .json(&req)
            .send()
            .await?;

        Ok(res.json().await?)
    }
}
