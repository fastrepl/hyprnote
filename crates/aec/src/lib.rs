use anyhow::Result;
use ort::{execution_providers::CoreMLExecutionProvider, session::Session};

const MODEL_BYTES: &[u8] = include_bytes!("../data/model.onnx");

pub struct AEC {
    session: Session,
}

impl AEC {
    pub fn new() -> Result<Self> {
        let session = Session::builder()?
            .with_execution_providers([
                #[cfg(target_os = "macos")]
                CoreMLExecutionProvider::default().build(),
            ])?
            .commit_from_memory(MODEL_BYTES)?;

        Ok(AEC { session })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aec() {
        let aec = AEC::new().unwrap();
    }
}
