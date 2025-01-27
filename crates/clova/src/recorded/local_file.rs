use super::{RequestParams, Resonse};

impl super::Client {
    // https://api.ncloud-docs.com/docs/en/ai-application-service-clovaspeech-longsentence-local
    pub async fn transcribe_local_file(
        &self,
        file_path: impl AsRef<std::path::Path>,
    ) -> Result<Resonse, anyhow::Error> {
        let mut url = self.api_base.clone();
        url.path_segments_mut()
            .unwrap()
            .push("recognizer")
            .push("upload");

        let params = RequestParams {
            language: super::Language::KoreanWithEnglish,
            completion: super::Completion::Sync,
        };

        let form = reqwest::multipart::Form::new()
            .text("params", serde_json::to_string(&params).unwrap())
            .text("type", "application/json")
            .file("media", file_path)
            .await?;

        let res = self
            .client
            .post(url)
            .header(reqwest::header::CONTENT_TYPE, "multipart/form-data")
            .multipart(form)
            .send()
            .await?
            .json::<Resonse>()
            .await?;

        Ok(res)
    }
}
