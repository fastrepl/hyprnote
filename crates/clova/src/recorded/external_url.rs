use super::ClovaClient;

impl ClovaClient {
    // https://api.ncloud-docs.com/docs/en/ai-application-service-clovaspeech-longsentence-externalurl
    pub async fn transcribe_external_url(&self) {
        let mut url = self.api_base.clone();
        url.set_path("/external/url");

        // self.client
        //     .post(url)
        //     .send()
        //     .await?
        //     .json::<Resonse>()
        //     .await?;

        todo!()
    }
}
