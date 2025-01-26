#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct STT {
    pub id: String,
}

pub async fn run_stt(_job: STT) -> Result<(), crate::Error> {
    Ok(())
}
