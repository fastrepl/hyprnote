// https://github.com/nkeenan38/voice_activity_detector/blob/main/src/vad.rs

use hypr_onnx::{ndarray, ort};

const MODEL: &[u8] = include_bytes!("../data/model.onnx");

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("only trained on this sample rate")]
    NotTrainedOnThisSampleRate,
    #[error("only trained on this chunk size")]
    NotTrainedOnThisChunkSize,
    #[error("chunk size too small considering sample rate")]
    InvalidRatio,
}

#[derive(Debug, Default)]
pub struct VoiceActivityDetectorBuilder {
    pub chunk_size: Option<usize>,
    pub sample_rate: Option<i64>,
}

impl VoiceActivityDetectorBuilder {
    pub fn chunk_size(mut self, chunk_size: usize) -> Self {
        self.chunk_size = Some(chunk_size);
        self
    }

    pub fn sample_rate(mut self, sample_rate: i64) -> Self {
        self.sample_rate = Some(sample_rate);
        self
    }

    pub fn build(self) -> Result<VoiceActivityDetector, Error> {
        let chunk_size = self.chunk_size.unwrap();
        let sample_rate = self.sample_rate.unwrap();

        if sample_rate != 16000 && sample_rate != 8000 {
            return Err(Error::NotTrainedOnThisSampleRate);
        }

        if sample_rate == 16000 && !vec![512, 768, 1024].contains(&chunk_size) {
            return Err(Error::NotTrainedOnThisChunkSize);
        }

        if sample_rate == 8000 && !vec![256, 512, 768].contains(&chunk_size) {
            return Err(Error::NotTrainedOnThisChunkSize);
        }

        if sample_rate > (31.25 * chunk_size as f64) as i64 {
            return Err(Error::InvalidRatio);
        }

        let h = ndarray::Array3::<f32>::zeros((2, 1, chunk_size));
        let c = ndarray::Array3::<f32>::zeros((2, 1, chunk_size));

        let session = hypr_onnx::load_model(MODEL).unwrap();

        Ok(VoiceActivityDetector {
            chunk_size,
            sample_rate,
            session,
            h,
            c,
        })
    }
}

#[derive(Debug)]
pub struct VoiceActivityDetector {
    chunk_size: usize,
    sample_rate: i64,
    session: ort::session::Session,
    h: ndarray::Array3<f32>,
    c: ndarray::Array3<f32>,
}

impl VoiceActivityDetector {
    pub fn builder() -> VoiceActivityDetectorBuilder {
        VoiceActivityDetectorBuilder::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vad() {
        let _ = VoiceActivityDetector::builder()
            .chunk_size(1024)
            .sample_rate(16000)
            .build()
            .unwrap();
    }
}
