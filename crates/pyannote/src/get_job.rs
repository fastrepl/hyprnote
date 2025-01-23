use crate::PyannoteClient;

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[specta(rename = "DiarizationRetrieveRequest")]
pub struct Request {
    pub job_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(untagged)]
#[specta(rename = "DiarizationRetrieveResponse")]
pub enum Response {
    Ok {
        status: JobStatus,
        #[serde(rename = "jobId")]
        job_id: String,
        #[serde(rename = "createdAt")]
        created_at: String,
        #[serde(rename = "updatedAt")]
        updated_at: String,
        output: JobResult,
    },
    Error {
        message: String,
    },
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum JobStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "created")]
    Created,
    #[serde(rename = "succeeded")]
    Succeeded,
    #[serde(rename = "canceled")]
    Canceled,
    #[serde(rename = "failed")]
    Failed,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(untagged)]
pub enum JobResult {
    Diarization(DiarizationResult),
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct DiarizationResult {
    pub diarization: Vec<DiarizationSegment>,
    pub confidence: Option<DiarizationConfidence>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct DiarizationSegment {
    pub speaker: String,
    pub start: f32,
    pub end: f32,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct DiarizationConfidence {
    pub resolution: f32,
    pub score: Vec<f32>,
}

// https://docs.pyannote.ai/api-reference/get-job
impl PyannoteClient {
    pub async fn get_job(&self, input: Request) -> Result<Response, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("/v1/jobs/{}", input.job_id));

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
