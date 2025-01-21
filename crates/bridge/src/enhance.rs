use crate::{Client, EnhanceRequest, Error};

impl Client {
    pub async fn enhance(
        &self,
        req: EnhanceRequest,
    ) -> Result<impl futures_util::Stream<Item = reqwest::Result<bytes::Bytes>>, Error> {
        let mut url = self.api_base.clone();
        url.set_path("/api/native/enhance");

        let req = self
            .reqwest_client
            .post(url)
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .header(reqwest::header::ACCEPT, "text/event-stream")
            .json(&req)
            .send()
            .await?;

        Ok(req.bytes_stream())
    }
}
