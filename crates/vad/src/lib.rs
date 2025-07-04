mod error;
pub use error::*;

use ndarray::{Array1, Array2, Array3, ArrayBase, Ix1, Ix3, OwnedRepr};
use ort::{
    session::{builder::GraphOptimizationLevel, Session},
    value::TensorRef,
};

const MODEL_BYTES: &[u8] =
    include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/assets/model.onnx"));

const SAMPLE_RATE: i64 = 16000;

const fn ms_to_samples(ms: usize) -> usize {
    (ms * SAMPLE_RATE as usize) / 1000
}

#[derive(Debug)]
pub struct Vad {
    session: Session,
    h_tensor: ArrayBase<OwnedRepr<f32>, Ix3>,
    c_tensor: ArrayBase<OwnedRepr<f32>, Ix3>,
    sample_rate_tensor: ArrayBase<OwnedRepr<i64>, Ix1>,
}

impl Vad {
    pub fn new() -> Result<Self, crate::Error> {
        let session = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_memory(MODEL_BYTES)?;

        let h_tensor = Array3::<f32>::zeros((2, 1, 64));
        let c_tensor = Array3::<f32>::zeros((2, 1, 64));
        let sample_rate_tensor = Array1::from_vec(vec![SAMPLE_RATE]);

        Ok(Self {
            session,
            h_tensor,
            c_tensor,
            sample_rate_tensor,
        })
    }

    /// Process a chunk of audio samples through the model and return the speech probability
    fn forward(&mut self, audio_chunk: &[f32]) -> Result<f32, crate::Error> {
        let samples = audio_chunk.len();
        let audio_tensor = Array2::from_shape_vec((1, samples), audio_chunk.to_vec())?;

        let mut result = self.session.run(ort::inputs![
            TensorRef::from_array_view(audio_tensor.view())?,
            TensorRef::from_array_view(self.sample_rate_tensor.view())?,
            TensorRef::from_array_view(self.h_tensor.view())?,
            TensorRef::from_array_view(self.c_tensor.view())?,
        ])?;

        // Update internal state tensors
        self.h_tensor = result
            .get("hn")
            .ok_or(Error::InvalidOutput)?
            .try_extract_array::<f32>()?
            .to_owned()
            .into_shape_with_order((2, 1, 64))?;

        self.c_tensor = result
            .get("cn")
            .ok_or(Error::InvalidOutput)?
            .try_extract_array::<f32>()?
            .to_owned()
            .into_shape_with_order((2, 1, 64))?;

        let prob_tensor = result.remove("output").ok_or(Error::InvalidOutput)?;
        let prob = *prob_tensor
            .try_extract_array::<f32>()?
            .first()
            .ok_or(Error::InvalidOutput)?;

        Ok(prob)
    }

    /// For longer audio, this will process in 30ms chunks and return the maximum probability
    pub fn run(&mut self, audio_samples: &[f32]) -> Result<f32, crate::Error> {
        if audio_samples.len() < ms_to_samples(30) {
            return self.forward(audio_samples);
        }

        let chunk_size = ms_to_samples(30);
        let num_chunks = audio_samples.len() / chunk_size;

        let mut max_prob = 0.0f32;

        for i in 0..num_chunks {
            let start = i * chunk_size;
            let end = (start + chunk_size).min(audio_samples.len());
            let prob = self.forward(&audio_samples[start..end])?;
            max_prob = max_prob.max(prob);
        }

        let remaining_start = num_chunks * chunk_size;
        if remaining_start < audio_samples.len()
            && audio_samples.len() - remaining_start >= (chunk_size / 2)
        {
            let prob = self.forward(&audio_samples[remaining_start..])?;
            max_prob = max_prob.max(prob);
        }

        Ok(max_prob)
    }

    pub fn reset(&mut self) {
        self.h_tensor = Array3::<f32>::zeros((2, 1, 64));
        self.c_tensor = Array3::<f32>::zeros((2, 1, 64));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vad_silence() {
        let mut vad = Vad::new().unwrap();
        let audio_samples = vec![0.0; 16000];
        let prob = vad.run(&audio_samples).unwrap();
        assert!(prob < 0.1);
    }

    #[test]
    fn test_vad_english_1() {
        let mut vad = Vad::new().unwrap();
        let audio_samples = to_f32(hypr_data::english_1::AUDIO);
        let prob = vad.run(&audio_samples).unwrap();
        assert!(prob > 0.8);
    }

    #[test]
    fn test_vad_english_2() {
        let mut vad = Vad::new().unwrap();
        let audio_samples = to_f32(hypr_data::english_2::AUDIO);
        let prob = vad.run(&audio_samples).unwrap();
        assert!(prob > 0.8);
    }

    fn to_f32(bytes: &[u8]) -> Vec<f32> {
        let mut samples = Vec::with_capacity(bytes.len() / 2);
        for chunk in bytes.chunks_exact(2) {
            let sample = i16::from_le_bytes([chunk[0], chunk[1]]) as f32 / 32768.0;
            samples.push(sample);
        }
        samples
    }
}
