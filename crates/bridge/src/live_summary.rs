use crate::{Client, Error, LiveSummaryRequest, LiveSummaryResponse};

impl Client {
    pub async fn live_summary(
        &self,
        req: LiveSummaryRequest,
    ) -> Result<LiveSummaryResponse, Error> {
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
