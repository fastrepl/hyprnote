use realfft::{num_complex::Complex, ComplexToReal, RealFftPlanner, RealToComplex};
use std::sync::Arc;

use hypr_onnx::{
    ndarray::{Array3, Array4},
    ort::session::Session,
};

mod error;
pub use error::*;

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
    block_len: usize,
    block_shift: usize,
    fft: Arc<dyn RealToComplex<f32>>,
    ifft: Arc<dyn ComplexToReal<f32>>,
}

impl AEC {
    pub fn new() -> Result<Self, crate::Error> {
        let (block_len, block_shift) = (512, 128);

        let mut fft_planner = RealFftPlanner::<f32>::new();
        let fft = fft_planner.plan_fft_forward(block_len);
        let ifft = fft_planner.plan_fft_inverse(block_len);

        let session_1 = hypr_onnx::load_model(model::BYTES_1)?;
        let session_2 = hypr_onnx::load_model(model::BYTES_2)?;

        Ok(AEC {
            session_1,
            session_2,
            block_len,
            block_shift,
            fft,
            ifft,
        })
    }

    // https://github.com/breizhn/DTLN-aec/blob/9d24e128b4f409db18227b8babb343016625921f/run_aec.py
    pub fn process(&self, mic_input: &[f32], lpb_input: &[f32]) -> Result<Vec<f32>, crate::Error> {
        let len_audio = mic_input.len().min(lpb_input.len());
        let mic_input = &mic_input[..len_audio];
        let lpb_input = &lpb_input[..len_audio];

        let padding = vec![0.0f32; self.block_len - self.block_shift];
        let mut audio = Vec::with_capacity(padding.len() * 2 + len_audio);
        audio.extend(&padding);
        audio.extend(mic_input);
        audio.extend(&padding);

        let mut lpb = Vec::with_capacity(padding.len() * 2 + len_audio);
        lpb.extend(&padding);
        lpb.extend(lpb_input);
        lpb.extend(&padding);

        let state_size = 128;
        let mut states_1 = Array4::<f32>::zeros((1, 2, state_size, 2));
        let mut states_2 = Array4::<f32>::zeros((1, 2, state_size, 2));

        // Preallocate output
        let mut out_file = vec![0.0f32; audio.len()];

        // Create buffers
        let mut in_buffer = vec![0.0f32; self.block_len];
        let mut in_buffer_lpb = vec![0.0f32; self.block_len];
        let mut out_buffer = vec![0.0f32; self.block_len];

        // Calculate number of frames
        let num_blocks = (audio.len() - (self.block_len - self.block_shift)) / self.block_shift;

        // Create FFT scratch buffer
        let mut scratch = vec![Complex::new(0.0f32, 0.0f32); self.fft.get_scratch_len()];
        let mut ifft_scratch = vec![Complex::new(0.0f32, 0.0f32); self.ifft.get_scratch_len()];

        // Process each block
        for idx in 0..num_blocks {
            // Shift values and write to buffer of the input audio
            in_buffer.rotate_left(self.block_shift);
            let start = idx * self.block_shift;
            in_buffer[self.block_len - self.block_shift..]
                .copy_from_slice(&audio[start..start + self.block_shift]);

            // Shift values and write to buffer of the loopback audio
            in_buffer_lpb.rotate_left(self.block_shift);
            in_buffer_lpb[self.block_len - self.block_shift..]
                .copy_from_slice(&lpb[start..start + self.block_shift]);

            // Calculate FFT of input block
            let mut in_buffer_fft = in_buffer.clone();
            let mut in_block_fft = vec![Complex::new(0.0f32, 0.0f32); self.block_len / 2 + 1];
            self.fft
                .process_with_scratch(&mut in_buffer_fft, &mut in_block_fft, &mut scratch)?;

            // Create magnitude
            let in_mag: Vec<f32> = in_block_fft.iter().map(|c| c.norm()).collect();
            let in_mag = Array3::from_shape_vec((1, 1, in_mag.len()), in_mag)?;

            // Calculate FFT of lpb block
            let mut lpb_buffer_fft = in_buffer_lpb.clone();
            let mut lpb_block_fft = vec![Complex::new(0.0f32, 0.0f32); self.block_len / 2 + 1];
            self.fft
                .process_with_scratch(&mut lpb_buffer_fft, &mut lpb_block_fft, &mut scratch)?;

            // Create lpb magnitude
            let lpb_mag: Vec<f32> = lpb_block_fft.iter().map(|c| c.norm()).collect();
            let lpb_mag = Array3::from_shape_vec((1, 1, lpb_mag.len()), lpb_mag)?;

            let mut outputs_1 = self.session_1.run(hypr_onnx::ort::inputs![
                in_mag.view(),
                states_1.view(),
                lpb_mag.view()
            ]?)?;

            let out_mask = outputs_1
                .remove("Identity")
                .ok_or_else(|| Error::MissingOutput("Identity".to_string()))?
                .try_extract_tensor::<f32>()?
                .view()
                .to_owned();
            let out_mask_1d = out_mask.into_shape_with_order((self.block_len / 2 + 1,))?;

            states_1 = outputs_1
                .remove("Identity_1")
                .ok_or_else(|| Error::MissingOutput("Identity_1".to_string()))?
                .try_extract_tensor::<f32>()?
                .view()
                .to_owned()
                .into_shape_with_order((1, 2, state_size, 2))?;

            // Apply mask and calculate IFFT
            for (i, c) in in_block_fft.iter_mut().enumerate() {
                *c *= out_mask_1d[i];
            }

            // IFFT
            let mut estimated_block = vec![0.0f32; self.block_len];
            self.ifft.process_with_scratch(
                &mut in_block_fft,
                &mut estimated_block,
                &mut ifft_scratch,
            )?;

            // Normalize IFFT result
            let norm_factor = 1.0 / self.block_len as f32;
            estimated_block.iter_mut().for_each(|x| *x *= norm_factor);

            // Reshape for second model
            let estimated_block = Array3::from_shape_vec((1, 1, self.block_len), estimated_block)?;
            let in_lpb = Array3::from_shape_vec((1, 1, self.block_len), in_buffer_lpb.clone())?;

            let mut outputs_2 = self.session_2.run(hypr_onnx::ort::inputs![
                estimated_block.view(),
                states_2.view(),
                in_lpb.view()
            ]?)?;

            let out_block = outputs_2
                .remove("Identity")
                .ok_or_else(|| Error::MissingOutput("Identity".into()))?
                .try_extract_tensor::<f32>()?
                .view()
                .to_owned();
            let out_block_1d = out_block.into_shape_with_order((self.block_len,))?;

            states_2 = outputs_2
                .remove("Identity_1")
                .ok_or_else(|| Error::MissingOutput("Identity_1".into()))?
                .try_extract_tensor::<f32>()?
                .view()
                .to_owned()
                .into_shape_with_order((1, 2, state_size, 2))?;

            // Shift output buffer
            out_buffer.rotate_left(self.block_shift);
            out_buffer[self.block_len - self.block_shift..].fill(0.0);

            // Add output block to buffer
            for (i, &val) in out_block_1d.iter().enumerate() {
                out_buffer[i] += val;
            }

            // Write to output file
            let out_start = idx * self.block_shift;
            out_file[out_start..out_start + self.block_shift]
                .copy_from_slice(&out_buffer[..self.block_shift]);
        }

        // Cut audio to original length
        let start_idx = self.block_len - self.block_shift;
        let mut predicted_speech = out_file[start_idx..start_idx + len_audio].to_vec();

        // Check for clipping and normalize if needed
        let max_val = predicted_speech
            .iter()
            .fold(0.0f32, |max, &x| max.max(x.abs()));
        if max_val > 1.0 {
            let scale = 0.99 / max_val;
            predicted_speech.iter_mut().for_each(|x| *x *= scale);
        }

        Ok(predicted_speech)
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
        let lpb_sample = WavReader::open(data_dir.join("doubletalk_lpb_sample.wav")).unwrap();
        let mic_sample = WavReader::open(data_dir.join("doubletalk_mic_sample.wav")).unwrap();
        let processed = WavReader::open(data_dir.join("doubletalk_processed.wav")).unwrap();

        let lpb_samples: Vec<f32> = lpb_sample
            .into_samples::<i16>()
            .map(|s| s.unwrap() as f32 / 32768.0)
            .collect();

        let mic_samples: Vec<f32> = mic_sample
            .into_samples::<i16>()
            .map(|s| s.unwrap() as f32 / 32768.0)
            .collect();

        let expected_samples: Vec<f32> = processed
            .into_samples::<i16>()
            .map(|s| s.unwrap() as f32 / 32768.0)
            .collect();

        let aec = AEC::new().unwrap();
        let result = aec.process(&mic_samples, &lpb_samples).unwrap();

        assert_eq!(result.len(), expected_samples.len());
        assert!(result.iter().all(|&x| x.is_finite()));

        if true {
            let mut file = hound::WavWriter::create(
                "./out.wav",
                hound::WavSpec {
                    channels: 1,
                    sample_rate: 16000,
                    bits_per_sample: 32,
                    sample_format: hound::SampleFormat::Float,
                },
            )
            .unwrap();
            for sample in result {
                file.write_sample(sample).unwrap();
            }
            file.finalize().unwrap();
        }
    }
}
