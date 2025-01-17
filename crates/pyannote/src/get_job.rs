use crate::PyannoteClient;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
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

#[derive(Debug, serde::Serialize, serde::Deserialize)]
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

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum JobResult {
    Diarization(DiarizationResult),
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DiarizationResult {
    pub diarization: Vec<DiarizationSegment>,
    pub confidence: DiarizationConfidence,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DiarizationSegment {
    pub speaker: String,
    pub start: f32,
    pub end: f32,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DiarizationConfidence {
    pub resolution: f32,
    pub score: Vec<f32>,
}

impl PyannoteClient {
    pub async fn get_job(
        &self,
        job_id: impl std::fmt::Display,
    ) -> Result<Response, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("/v1/jobs/{}", job_id));

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
