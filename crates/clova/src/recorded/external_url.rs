use super::{RequestParams, Resonse};

impl super::ClovaClient {
    // https://api.ncloud-docs.com/docs/en/ai-application-service-clovaspeech-longsentence-externalurl
    pub async fn transcribe_external_url(
        &self,
        audio_url: impl Into<String>,
    ) -> Result<Resonse, anyhow::Error> {
        let mut url = self.api_base.clone();
        url.path_segments_mut()
            .unwrap()
            .push("recognizer")
            .push("url");

        let params = RequestParams {
            language: super::Language::KoreanWithEnglish,
            completion: super::Completion::Sync,
        };

        let mut params_value: serde_json::Value = serde_json::to_value(params).unwrap();
        params_value["url"] = serde_json::Value::String(audio_url.into());

        let res = self
            .client
            .post(url)
            .json(&params_value)
            .send()
            .await?
            .json::<Resonse>()
            .await?;

        Ok(res)
    }
}
