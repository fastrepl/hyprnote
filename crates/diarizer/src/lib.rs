use anyhow::Result;

use hypr_onnx::{
    ndarray,
    ort::{session::Session, value::Value},
};

mod math;

pub struct Diarizer {
    session: Session,
    config: Config,
}

struct Config {
    offset: usize,
    sampling_rate: usize,
    step: usize,
}

// https://huggingface.co/onnx-community/pyannote-segmentation-3.0/blob/53cc64a214d9262cfaf6989b7c795414e2d54f58/README.md?code=true#L39-L40
#[derive(Debug)]
pub struct SpeakerSegment {
    // 0 ~ 6
    pub id: usize,
    pub start: f32,
    pub end: f32,
    pub confidence: f32,
}

const MODEL_BYTES: &[u8] = include_bytes!("../data/model.onnx");

impl Diarizer {
    pub fn new() -> Result<Self> {
        let session = hypr_onnx::load_model(MODEL_BYTES)?;

        // https://huggingface.co/onnx-community/pyannote-segmentation-3.0/blob/main/preprocessor_config.json
        let config = Config {
            offset: 990,
            sampling_rate: 16000,
            step: 270,
        };

        Ok(Diarizer { session, config })
    }

    pub fn run(&self, samples: &[f32]) -> Result<Vec<SpeakerSegment>> {
        let input_array = ndarray::Array3::from_shape_vec((1, 1, samples.len()), samples.to_vec())?;
        let input_tensor = Value::from_array(input_array.view())?;
        let inputs = vec![("input_values", input_tensor)];

        let output = self.session.run(inputs)?;
        let logits = output.get("logits").unwrap().try_extract_tensor::<f32>()?;

        let result = self.post_process_speaker_diarization(logits, samples.len());
        Ok(result)
    }

    // https://github.com/huggingface/transformers.js/blob/14bf689c983c68c7e870b970e1bcce79c791c3c9/src/models/pyannote/feature_extraction_pyannote.js#L34
    fn samples_to_frames(&self, num_samples: usize) -> usize {
        ((num_samples - self.config.offset) as f32 / self.config.step as f32).ceil() as usize
    }

    // https://github.com/huggingface/transformers.js/blob/14bf689c983c68c7e870b970e1bcce79c791c3c9/src/models/pyannote/feature_extraction_pyannote.js#L44
    fn post_process_speaker_diarization(
        &self,
        logits: ndarray::ArrayViewD<f32>,
        num_samples: usize,
    ) -> Vec<SpeakerSegment> {
        // Calculate the ratio for converting frames to time
        let ratio = (num_samples as f32 / self.samples_to_frames(num_samples) as f32)
            / self.config.sampling_rate as f32;

        let mut results = Vec::new();

        let scores = logits.index_axis(ndarray::Axis(0), 0);
        let mut accumulated_segments = Vec::new();

        let mut current_speaker: i32 = -1;

        for i in 0..scores.shape()[0] {
            let frame_scores = scores.index_axis(ndarray::Axis(0), i);
            let frame_scores_1d = frame_scores.into_dimensionality::<ndarray::Ix1>().unwrap();
            let probabilities = math::softmax(frame_scores_1d);
            let (score, id) = math::argmax(probabilities.view());

            if id as i32 != current_speaker {
                current_speaker = id as i32;
                accumulated_segments.push(SpeakerSegment {
                    id,
                    start: i as f32 * ratio,
                    end: (i + 1) as f32 * ratio,
                    confidence: score,
                });
            } else if let Some(last_segment) = accumulated_segments.last_mut() {
                last_segment.end = (i + 1) as f32 * ratio;
                last_segment.confidence += score;
            }
        }

        for segment in &mut accumulated_segments {
            let frame_count = ((segment.end - segment.start) / ratio).round() as f32;
            segment.confidence /= frame_count;
        }

        results.extend(accumulated_segments);
        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use hound;
    use reqwest;

    // https://github.com/huggingface/transformers.js/blob/14bf689/src/utils/audio.js#L26
    async fn download_audio() -> anyhow::Result<Vec<f32>> {
        let bytes = reqwest::get(
            "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/mlk.wav",
        )
        .await?
        .bytes()
        .await?;

        let cursor = std::io::Cursor::new(bytes);
        let mut reader = hound::WavReader::new(cursor)?;

        let samples: Vec<f32> = match reader.spec().sample_format {
            hound::SampleFormat::Int => reader
                .samples::<i32>()
                .map(|s| s.unwrap() as f32 / i32::MAX as f32)
                .collect(),

            hound::SampleFormat::Float => reader.samples::<f32>().map(|s| s.unwrap()).collect(),
        };

        Ok(samples)
    }

    #[tokio::test]
    async fn test_segmentation() {
        let samples = download_audio().await.unwrap();
        assert!(samples.len() == 208000);

        let diarizer = Diarizer::new().unwrap();
        let result = diarizer.run(&samples).unwrap();
        assert_eq!(result.len(), 11);

        assert_eq!(result[0].id, 0);
        assert_eq!(result[1].id, 2);
        assert_eq!(result[2].id, 0);
        assert_eq!(result[3].id, 2);
        assert_eq!(result[4].id, 0);
        assert_eq!(result[5].id, 3);
        assert_eq!(result[6].id, 6);
        assert_eq!(result[7].id, 2);
        assert_eq!(result[8].id, 0);
        assert_eq!(result[9].id, 2);
        assert_eq!(result[10].id, 0);

        assert_relative_eq!(result[0].start, 0.0, epsilon = 0.2);
        assert_relative_eq!(result[0].end, 1.0, epsilon = 0.2);
        assert_relative_eq!(result[10].start, 12.5, epsilon = 0.2);
        assert_relative_eq!(result[10].end, 13.0, epsilon = 0.2);
    }
}
