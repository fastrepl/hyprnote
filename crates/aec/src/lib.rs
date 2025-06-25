use anyhow::Result;
use hypr_onnx::ort::session::Session;

#[cfg(feature = "128")]
mod model {
    pub const BYTES_1: &[u8] = include_bytes!("../data/model_128_1.onnx");
    pub const BYTES_2: &[u8] = include_bytes!("../data/model_128_2.onnx");
}

#[cfg(feature = "256")]
mod model {
    pub const BYTES_1: &[u8] = include_bytes!("../data/model_256_1.onnx");
    pub const BYTES_2: &[u8] = include_bytes!("../data/model_256_2.onnx");
}

#[cfg(feature = "512")]
mod model {
    pub const BYTES_1: &[u8] = include_bytes!("../data/model_512_1.onnx");
    pub const BYTES_2: &[u8] = include_bytes!("../data/model_512_2.onnx");
}

pub struct AEC {
    session_1: Session,
    session_2: Session,
}

impl AEC {
    pub fn new() -> Result<Self> {
        Ok(AEC {
            session_1: hypr_onnx::load_model(model::BYTES_1)?,
            session_2: hypr_onnx::load_model(model::BYTES_2)?,
        })
    }

    // https://github.com/breizhn/DTLN-aec/blob/9d24e128b4f409db18227b8babb343016625921f/run_aec.py
    pub fn process(&self, _mic_input: &[f32], _lpb_input: &[f32]) -> Result<Vec<f32>> {
        Ok(vec![])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use hound::WavReader;

    #[test]
    fn test_aec() {
        let data_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("data");

        // all pcm_s16le, 16k, 1chan.
        let _lpb_sample = WavReader::open(data_dir.join("doubletalk_lpb_sample.wav")).unwrap();
        let _mic_sample = WavReader::open(data_dir.join("doubletalk_mic_sample.wav")).unwrap();
        let processed = WavReader::open(data_dir.join("doubletalk_processed.wav")).unwrap();

        assert_eq!(processed.len(), 170720);

        let _aec = AEC::new().unwrap();
    }
}
