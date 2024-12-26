use anyhow::Result;
use ort::{execution_providers::CoreMLExecutionProvider, session::Session};

const MODEL_BYTES: &[u8] = include_bytes!("../data/model.onnx");

pub struct Aec {
    session: Session,
}

impl Aec {
    pub fn new() -> Result<Self> {
        let session = Session::builder()?
            .with_execution_providers([
                #[cfg(target_os = "macos")]
                CoreMLExecutionProvider::default().build(),
            ])?
            .commit_from_memory(MODEL_BYTES)?;

        Ok(Aec { session })
    }
}
