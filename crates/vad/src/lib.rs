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

        if sample_rate == 16000 && ![512, 768, 1024].contains(&chunk_size) {
            return Err(Error::NotTrainedOnThisChunkSize);
        }

        if sample_rate == 8000 && ![256, 512, 768].contains(&chunk_size) {
            return Err(Error::NotTrainedOnThisChunkSize);
        }

        if sample_rate > (31.25 * chunk_size as f32) as i64 {
            return Err(Error::InvalidRatio);
        }

        let h = ndarray::Array3::<f32>::zeros((2, 1, 64));
        let c = ndarray::Array3::<f32>::zeros((2, 1, 64));

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

    // https://github.com/nkeenan38/voice_activity_detector/blob/fd6cb6285a8cb15c11a8b35b9a9b94d2cb2fd6a4/src/vad.rs#L39
    pub fn predict<S, I>(&mut self, samples: I) -> f32
    where
        S: dasp::sample::ToSample<f32>,
        I: IntoIterator<Item = S>,
    {
        let mut input = ndarray::Array2::<f32>::zeros((1, self.chunk_size));
        for (i, sample) in samples.into_iter().take(self.chunk_size).enumerate() {
            input[[0, i]] = sample.to_sample_();
        }

        let sample_rate = ndarray::arr1::<i64>(&[self.sample_rate]);

        let inputs = ort::inputs![
            "input" => input.view(),
            "sr" => sample_rate.view(),
            "h" => self.h.view(),
            "c" => self.c.view(),
        ]
        .unwrap();

        let outputs = self.session.run(inputs).unwrap();

        let hn = outputs
            .get("hn")
            .unwrap()
            .try_extract_tensor::<f32>()
            .unwrap();
        let cn = outputs
            .get("cn")
            .unwrap()
            .try_extract_tensor::<f32>()
            .unwrap();

        self.h.assign(&hn.view());
        self.c.assign(&cn.view());

        let output = outputs
            .get("output")
            .unwrap()
            .try_extract_tensor::<f32>()
            .unwrap();
        let probability = output.view()[[0, 0]];

        probability
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vad() {
        let mut vad = VoiceActivityDetector::builder()
            .chunk_size(1024)
            .sample_rate(16000)
            .build()
            .unwrap();

        assert!(vad.predict(vec![0.0; 512]) < 0.1);
        assert!(vad.predict(vec![0.0; 1024]) < 0.1);
        assert!(vad.predict(vec![0.0; 2048]) < 0.1);
    }
}
