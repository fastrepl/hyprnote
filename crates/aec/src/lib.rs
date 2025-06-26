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
    pub const STATE_SIZE: usize = 128;
}

#[cfg(feature = "256")]
mod model {
    pub const BYTES_1: &[u8] = include_bytes!("../data/model_256_1.onnx");
    pub const BYTES_2: &[u8] = include_bytes!("../data/model_256_2.onnx");
    pub const STATE_SIZE: usize = 256;
}

#[cfg(feature = "512")]
mod model {
    pub const BYTES_1: &[u8] = include_bytes!("../data/model_512_1.onnx");
    pub const BYTES_2: &[u8] = include_bytes!("../data/model_512_2.onnx");
    pub const STATE_SIZE: usize = 512;
}

pub struct AEC {
    session_1: Session,
    session_2: Session,
    block_len: usize,
    block_shift: usize,
    fft: Arc<dyn RealToComplex<f32>>,
    ifft: Arc<dyn ComplexToReal<f32>>,
}

// model already trained with these numbers.
pub const BLOCK_SIZE: usize = 512;
pub const BLOCK_SHIFT: usize = 128;

impl AEC {
    pub fn new() -> Result<Self, crate::Error> {
        let (block_len, block_shift) = (BLOCK_SIZE, BLOCK_SHIFT);

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

        let state_size = model::STATE_SIZE;
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

        // Preallocate all buffers to avoid repeated allocations
        let mut scratch = vec![Complex::new(0.0f32, 0.0f32); self.fft.get_scratch_len()];
        let mut ifft_scratch = vec![Complex::new(0.0f32, 0.0f32); self.ifft.get_scratch_len()];
        let mut in_buffer_fft = vec![0.0f32; self.block_len];
        let mut in_block_fft = vec![Complex::new(0.0f32, 0.0f32); self.block_len / 2 + 1];
        let mut lpb_buffer_fft = vec![0.0f32; self.block_len];
        let mut lpb_block_fft = vec![Complex::new(0.0f32, 0.0f32); self.block_len / 2 + 1];
        let mut in_mag_vec = vec![0.0f32; self.block_len / 2 + 1];
        let mut lpb_mag_vec = vec![0.0f32; self.block_len / 2 + 1];
        let mut estimated_block_vec = vec![0.0f32; self.block_len];
        let mut in_mag = Array3::<f32>::zeros((1, 1, self.block_len / 2 + 1));
        let mut lpb_mag = Array3::<f32>::zeros((1, 1, self.block_len / 2 + 1));
        let mut estimated_block = Array3::<f32>::zeros((1, 1, self.block_len));
        let mut in_lpb = Array3::<f32>::zeros((1, 1, self.block_len));

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
            in_buffer_fft.copy_from_slice(&in_buffer);
            self.fft
                .process_with_scratch(&mut in_buffer_fft, &mut in_block_fft, &mut scratch)?;

            // Calculate magnitude
            for (i, &c) in in_block_fft.iter().enumerate() {
                in_mag_vec[i] = c.norm();
            }
            for (i, &mag) in in_mag_vec.iter().enumerate() {
                in_mag[[0, 0, i]] = mag;
            }

            // Calculate FFT of lpb block
            lpb_buffer_fft.copy_from_slice(&in_buffer_lpb);
            self.fft
                .process_with_scratch(&mut lpb_buffer_fft, &mut lpb_block_fft, &mut scratch)?;

            // Calculate lpb magnitude
            for (i, &c) in lpb_block_fft.iter().enumerate() {
                lpb_mag_vec[i] = c.norm();
            }
            for (i, &mag) in lpb_mag_vec.iter().enumerate() {
                lpb_mag[[0, 0, i]] = mag;
            }

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
            self.ifft.process_with_scratch(
                &mut in_block_fft,
                &mut estimated_block_vec,
                &mut ifft_scratch,
            )?;

            // Normalize IFFT result
            let norm_factor = 1.0 / self.block_len as f32;
            estimated_block_vec
                .iter_mut()
                .for_each(|x| *x *= norm_factor);

            // Copy to Array3 for second model
            for (i, &val) in estimated_block_vec.iter().enumerate() {
                estimated_block[[0, 0, i]] = val;
            }
            for (i, &val) in in_buffer_lpb.iter().enumerate() {
                in_lpb[[0, 0, i]] = val;
            }

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

// cargo test -p aec --no-default-features --features 128
// cargo test -p aec --no-default-features --features 256
// cargo test -p aec --no-default-features --features 512
#[cfg(test)]
mod tests {
    use super::*;
    use dasp::sample::Sample;

    mod data {
        pub const DOUBLETALK_LPB: &[u8] = include_bytes!("../data/doubletalk_lpb_sample.wav");
        pub const DOUBLETALK_MIC: &[u8] = include_bytes!("../data/doubletalk_mic_sample.wav");

        pub const HYPRNOTE_LPB: &[u8] = include_bytes!("../data/hyprnote_lpb.wav");
        pub const HYPRNOTE_MIC: &[u8] = include_bytes!("../data/hyprnote_mic.wav");
    }

    fn get_feature() -> &'static str {
        if cfg!(feature = "128") {
            "128"
        } else if cfg!(feature = "256") {
            "256"
        } else if cfg!(feature = "512") {
            "512"
        } else {
            unreachable!()
        }
    }

    #[test]
    fn test_aec_doubletalk() {
        let feature = get_feature();

        // all pcm_s16le, 16k, 1chan.
        let lpb_sample = rodio::Decoder::new(std::io::BufReader::new(std::io::Cursor::new(
            data::DOUBLETALK_LPB,
        )))
        .unwrap()
        .collect::<Vec<_>>();

        let mic_sample = rodio::Decoder::new(std::io::BufReader::new(std::io::Cursor::new(
            data::DOUBLETALK_MIC,
        )))
        .unwrap()
        .collect::<Vec<_>>();

        let lpb_samples: Vec<f32> = lpb_sample.into_iter().map(|s| s.to_sample()).collect();
        let mic_samples: Vec<f32> = mic_sample.into_iter().map(|s| s.to_sample()).collect();

        let aec = AEC::new().unwrap();
        let result = aec.process(&mic_samples, &lpb_samples).unwrap();

        assert!(result.iter().all(|&x| x.is_finite()));

        {
            let mut file = hound::WavWriter::create(
                format!("./doubletalk_{}.wav", feature),
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

    #[test]
    fn test_aec_hyprnote() {
        let feature = get_feature();

        // all pcm_s16le, 16k, 1chan.
        let lpb_sample = rodio::Decoder::new(std::io::BufReader::new(std::io::Cursor::new(
            data::HYPRNOTE_LPB,
        )))
        .unwrap()
        .collect::<Vec<_>>();

        let mic_sample = rodio::Decoder::new(std::io::BufReader::new(std::io::Cursor::new(
            data::HYPRNOTE_MIC,
        )))
        .unwrap()
        .collect::<Vec<_>>();

        let lpb_samples: Vec<f32> = lpb_sample.into_iter().map(|s| s.to_sample()).collect();
        let mic_samples: Vec<f32> = mic_sample.into_iter().map(|s| s.to_sample()).collect();

        let aec = AEC::new().unwrap();
        let result = aec.process(&mic_samples, &lpb_samples).unwrap();

        assert!(result.iter().all(|&x| x.is_finite()));

        {
            let mut file = hound::WavWriter::create(
                format!("./hyprnote_{}.wav", feature),
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
