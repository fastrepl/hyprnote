use super::PyannoteClient;

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[specta(rename = "DiarizationSubmitRequest")]
pub struct Request {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub webhook: Option<String>,
    #[serde(rename = "numSpeakers", skip_serializing_if = "Option::is_none")]
    pub num_speakers: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<bool>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(untagged)]
#[specta(rename = "DiarizationSubmitResponse")]
pub enum Response {
    Ok {
        status: String,
        #[serde(rename = "jobId")]
        job_id: String,
    },
    Error {
        message: String,
    },
}

// https://docs.pyannote.ai/api-reference/diarize
impl PyannoteClient {
    pub async fn submit_diarization_job(&self, req: Request) -> Result<Response, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path("/v1/diarize");

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
