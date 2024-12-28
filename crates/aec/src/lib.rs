use anyhow::Result;
use ort::{execution_providers::CoreMLExecutionProvider, session::Session};

const MODEL_1_BYTES: &[u8] = include_bytes!("../data/model_1.onnx");
const MODEL_2_BYTES: &[u8] = include_bytes!("../data/model_2.onnx");

fn load_model(bytes: &[u8]) -> Result<Session> {
    let session = Session::builder()?
        .with_execution_providers([
            #[cfg(target_os = "macos")]
            CoreMLExecutionProvider::default().build(),
        ])?
        .commit_from_memory(bytes)?;

    Ok(session)
}

pub struct AEC {
    session_1: Session,
    session_2: Session,
}

impl AEC {
    pub fn new() -> Result<Self> {
        Ok(AEC {
            session_1: load_model(MODEL_1_BYTES)?,
            session_2: load_model(MODEL_2_BYTES)?,
        })
    }

    // https://github.com/breizhn/DTLN-aec/blob/9d24e128b4f409db18227b8babb343016625921f/run_aec.py
    pub fn process(&self, input: &[f32]) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aec() {
        let aec = AEC::new().unwrap();
    }
}
