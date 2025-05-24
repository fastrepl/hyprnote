use hypr_onnx::{
    ndarray::{self, Array2},
    ort::{self, session::Session},
};

const EMBEDDING_ONNX: &[u8] = include_bytes!("./data/embedding.onnx");

pub struct EmbeddingExtractor {
    session: Session,
}

impl EmbeddingExtractor {
    pub fn new() -> Self {
        let session = hypr_onnx::load_model(EMBEDDING_ONNX).unwrap();
        Self { session }
    }

    pub fn compute(&mut self, samples: &[i16]) -> Result<Vec<f32>, anyhow::Error> {
        let mut samples_f32 = vec![0.0; samples.len()];
        knf_rs::convert_integer_to_float_audio(samples, &mut samples_f32);
        let samples = &samples_f32;

        let features: Array2<f32> = knf_rs::compute_fbank(samples).unwrap();
        let features = features.insert_axis(ndarray::Axis(0));
        let inputs = ort::inputs! ["feats" => features.view()]?;

        let ort_outs = self.session.run(inputs)?;
        let ort_out = ort_outs
            .get("embs")
            .unwrap()
            .try_extract_tensor::<f32>()
            .unwrap();

        let embeddings = ort_out.iter().copied().collect::<Vec<_>>();
        Ok(embeddings)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedding_extractor() {
        let mut extractor = EmbeddingExtractor::new();
        extractor.compute(&[0; 16000]).unwrap();
    }
}
