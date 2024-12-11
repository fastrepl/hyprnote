use anyhow::Result;
use ndarray::Array3;
use ort::{execution_providers::CoreMLExecutionProvider, session::Session, value::Value};

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
    id: usize,
    start: f32,
    end: f32,
    confidence: f32,
}

const MODEL_BYTES: &[u8] = include_bytes!("../models/diarizer.onnx");

impl Diarizer {
    pub fn new() -> Result<Self> {
        let session = Session::builder()?
            .with_execution_providers([
                #[cfg(target_os = "macos")]
                CoreMLExecutionProvider::default().build(),
            ])?
            .commit_from_memory(MODEL_BYTES)?;

        // https://huggingface.co/onnx-community/pyannote-segmentation-3.0/blob/main/preprocessor_config.json
        let config = Config {
            offset: 990,
            sampling_rate: 16000,
            step: 270,
        };

        Ok(Diarizer { session, config })
    }

    pub fn run(&self, samples: &[f32]) -> Result<Vec<SpeakerSegment>> {
        let input_array = Array3::from_shape_vec((1, 1, samples.len()), samples.to_vec())?;
        let input_tensor = Value::from_array(input_array.view())?;
        let inputs = vec![("input_values", input_tensor)];

        let logits = self
            .session
            .run(inputs)?
            .get("logits")
            .unwrap()
            .try_extract_tensor::<f32>()?
            .as_slice()
            .unwrap()
            .to_vec();

        let result = self.post_process_speaker_diarization(logits);
        Ok(result)
    }

    // https://github.com/huggingface/transformers.js/blob/14bf689c983c68c7e870b970e1bcce79c791c3c9/src/models/pyannote/feature_extraction_pyannote.js#L34
    fn samples_to_frames(&self, samples: usize) -> f32 {
        (samples as f32 - self.config.offset as f32) / self.config.step as f32
    }

    // https://github.com/huggingface/transformers.js/blob/14bf689c983c68c7e870b970e1bcce79c791c3c9/src/models/pyannote/feature_extraction_pyannote.js#L44
    fn post_process_speaker_diarization(&self, logits: Vec<f32>) -> Vec<SpeakerSegment> {
        let num_frames = logits.len() / 2; // Since we have 2 scores per frame
        let num_samples = num_frames * self.config.step + self.config.offset;

        let ratio = (num_samples as f32 / self.samples_to_frames(num_samples))
            / self.config.sampling_rate as f32;

        let mut accumulated_segments = Vec::new();
        let mut current_speaker = usize::MAX;

        for i in 0..num_frames {
            let scores = &logits[i * 2..(i + 1) * 2];
            let probabilities = softmax(scores);
            let (score, id) = max(&probabilities);

            let (start, end) = (i as f32, (i + 1) as f32);

            if id != current_speaker {
                // Speaker has changed
                current_speaker = id;
                accumulated_segments.push(SpeakerSegment {
                    id,
                    start: start * ratio,
                    end: end * ratio,
                    confidence: score,
                });
            } else {
                // Continue the current segment
                let last_segment = accumulated_segments.last_mut().unwrap();
                last_segment.end = end * ratio;
                last_segment.confidence += score;
            }
        }

        for segment in &mut accumulated_segments {
            let frames = (segment.end - segment.start) / ratio;
            segment.confidence /= frames;
        }

        accumulated_segments
    }
}

fn softmax(scores: &[f32]) -> Vec<f32> {
    let max_score = scores.iter().fold(f32::NEG_INFINITY, |a, &b| a.max(b));
    let exp_scores: Vec<f32> = scores.iter().map(|&x| (x - max_score).exp()).collect();
    let sum: f32 = exp_scores.iter().sum();
    exp_scores.iter().map(|&x| x / sum).collect()
}

fn max(probabilities: &[f32]) -> (f32, usize) {
    probabilities
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
        .map(|(idx, &val)| (val, idx))
        .unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    use hound;
    use reqwest;

    // https://github.com/huggingface/transformers.js/blob/14bf689/src/utils/audio.js#L26
    async fn download_audio() -> anyhow::Result<Vec<f32>> {
        let bytes = reqwest::get(
            "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/mlk.wav",
        )
        .await
        .expect("Failed to download audio")
        .bytes()
        .await
        .expect("Failed to read audio bytes");

        let cursor = std::io::Cursor::new(bytes);
        let mut reader = hound::WavReader::new(cursor).expect("Failed to read WAV file");

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
        assert!(result.len() > 1);
    }
}
