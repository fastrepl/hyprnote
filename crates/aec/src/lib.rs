use realfft::{num_complex::Complex, ComplexToReal, RealFftPlanner, RealToComplex};
use std::sync::Arc;

use hypr_onnx::{
    ndarray::{Array3, Array4},
    ort::session::Session,
};

mod error;
pub use error::*;

mod model;
pub use model::{BLOCK_SHIFT, BLOCK_SIZE};

pub struct AEC {
    session_1: Session,
    session_2: Session,
    block_len: usize,
    block_shift: usize,
    fft: Arc<dyn RealToComplex<f32>>,
    ifft: Arc<dyn ComplexToReal<f32>>,
    // Streaming state
    states_1: Array4<f32>,
    states_2: Array4<f32>,
    in_buffer: Vec<f32>,
    in_buffer_lpb: Vec<f32>,
    out_buffer: Vec<f32>,
    is_first_chunk: bool,
}

impl AEC {
    pub fn new() -> Result<Self, crate::Error> {
        let (block_len, block_shift) = (model::BLOCK_SIZE, model::BLOCK_SHIFT);

        let mut fft_planner = RealFftPlanner::<f32>::new();
        let fft = fft_planner.plan_fft_forward(block_len);
        let ifft = fft_planner.plan_fft_inverse(block_len);

        let session_1 = hypr_onnx::load_model(model::BYTES_1)?;
        let session_2 = hypr_onnx::load_model(model::BYTES_2)?;

        let state_size = model::STATE_SIZE;

        Ok(AEC {
            session_1,
            session_2,
            block_len,
            block_shift,
            fft,
            ifft,
            // Initialize persistent state
            states_1: Array4::<f32>::zeros((1, 2, state_size, 2)),
            states_2: Array4::<f32>::zeros((1, 2, state_size, 2)),
            in_buffer: vec![0.0f32; block_len],
            in_buffer_lpb: vec![0.0f32; block_len],
            out_buffer: vec![0.0f32; block_len],
            is_first_chunk: true,
        })
    }

    /// Reset the internal state for a new session
    pub fn reset(&mut self) {
        let state_size = model::STATE_SIZE;
        self.states_1 = Array4::<f32>::zeros((1, 2, state_size, 2));
        self.states_2 = Array4::<f32>::zeros((1, 2, state_size, 2));
        self.in_buffer.fill(0.0);
        self.in_buffer_lpb.fill(0.0);
        self.out_buffer.fill(0.0);
        self.is_first_chunk = true;
    }

    /// Process audio in streaming mode (maintains state between calls)
    pub fn process_streaming(
        &mut self,
        mic_input: &[f32],
        lpb_input: &[f32],
    ) -> Result<Vec<f32>, crate::Error> {
        let len_audio = mic_input.len().min(lpb_input.len());
        let mic_input = &mic_input[..len_audio];
        let lpb_input = &lpb_input[..len_audio];

        // For streaming, we don't add padding to each chunk
        // Only process if we have enough samples
        if len_audio == 0 {
            return Ok(vec![]);
        }

        self._process_internal(mic_input, lpb_input, false)
    }

    /// Process audio in non-streaming mode (resets state, adds padding)
    pub fn process(
        &mut self,
        mic_input: &[f32],
        lpb_input: &[f32],
    ) -> Result<Vec<f32>, crate::Error> {
        // Reset state for non-streaming processing
        self.reset();

        let len_audio = mic_input.len().min(lpb_input.len());
        let mic_input = &mic_input[..len_audio];
        let lpb_input = &lpb_input[..len_audio];

        // Add padding for non-streaming mode
        let padding = vec![0.0f32; self.block_len - self.block_shift];
        let mut audio = Vec::with_capacity(padding.len() * 2 + len_audio);
        audio.extend(&padding);
        audio.extend(mic_input);
        audio.extend(&padding);

        let mut lpb = Vec::with_capacity(padding.len() * 2 + len_audio);
        lpb.extend(&padding);
        lpb.extend(lpb_input);
        lpb.extend(&padding);

        let result = self._process_internal(&audio, &lpb, true)?;

        // Cut audio to original length
        let start_idx = self.block_len - self.block_shift;
        Ok(result[start_idx..start_idx + len_audio].to_vec())
    }

    fn _process_internal(
        &mut self,
        audio: &[f32],
        lpb: &[f32],
        with_padding: bool,
    ) -> Result<Vec<f32>, crate::Error> {
        // Preallocate output
        let mut out_file = vec![0.0f32; audio.len()];

        // Calculate number of frames
        let effective_len = if with_padding {
            audio.len() - (self.block_len - self.block_shift)
        } else {
            // For streaming, we might not have a full final block
            audio.len()
        };
        let num_blocks = effective_len / self.block_shift;

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
            self.in_buffer.rotate_left(self.block_shift);
            let start = idx * self.block_shift;
            let end = (start + self.block_shift).min(audio.len());
            let chunk_len = end - start;

            if chunk_len > 0 {
                self.in_buffer[self.block_len - self.block_shift
                    ..self.block_len - self.block_shift + chunk_len]
                    .copy_from_slice(&audio[start..end]);
                // Zero-pad if chunk is smaller than block_shift
                if chunk_len < self.block_shift {
                    self.in_buffer[self.block_len - self.block_shift + chunk_len..].fill(0.0);
                }
            }

            // Shift values and write to buffer of the loopback audio
            self.in_buffer_lpb.rotate_left(self.block_shift);
            if chunk_len > 0 {
                self.in_buffer_lpb[self.block_len - self.block_shift
                    ..self.block_len - self.block_shift + chunk_len]
                    .copy_from_slice(&lpb[start..end]);
                // Zero-pad if chunk is smaller than block_shift
                if chunk_len < self.block_shift {
                    self.in_buffer_lpb[self.block_len - self.block_shift + chunk_len..].fill(0.0);
                }
            }

            // Calculate FFT of input block
            in_buffer_fft.copy_from_slice(&self.in_buffer);
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
            lpb_buffer_fft.copy_from_slice(&self.in_buffer_lpb);
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
                self.states_1.view(),
                lpb_mag.view()
            ]?)?;

            let out_mask = outputs_1
                .remove("Identity")
                .ok_or_else(|| Error::MissingOutput("Identity".to_string()))?
                .try_extract_tensor::<f32>()?
                .view()
                .to_owned();
            let out_mask_1d = out_mask.into_shape_with_order((self.block_len / 2 + 1,))?;

            self.states_1 = outputs_1
                .remove("Identity_1")
                .ok_or_else(|| Error::MissingOutput("Identity_1".to_string()))?
                .try_extract_tensor::<f32>()?
                .view()
                .to_owned()
                .into_shape_with_order((1, 2, model::STATE_SIZE, 2))?;

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
            for (i, &val) in self.in_buffer_lpb.iter().enumerate() {
                in_lpb[[0, 0, i]] = val;
            }

            let mut outputs_2 = self.session_2.run(hypr_onnx::ort::inputs![
                estimated_block.view(),
                self.states_2.view(),
                in_lpb.view()
            ]?)?;

            let out_block = outputs_2
                .remove("Identity")
                .ok_or_else(|| Error::MissingOutput("Identity".into()))?
                .try_extract_tensor::<f32>()?
                .view()
                .to_owned();
            let out_block_1d = out_block.into_shape_with_order((self.block_len,))?;

            self.states_2 = outputs_2
                .remove("Identity_1")
                .ok_or_else(|| Error::MissingOutput("Identity_1".into()))?
                .try_extract_tensor::<f32>()?
                .view()
                .to_owned()
                .into_shape_with_order((1, 2, model::STATE_SIZE, 2))?;

            // Shift output buffer
            self.out_buffer.rotate_left(self.block_shift);
            self.out_buffer[self.block_len - self.block_shift..].fill(0.0);

            // Add output block to buffer
            for (i, &val) in out_block_1d.iter().enumerate() {
                self.out_buffer[i] += val;
            }

            // Write to output file
            let out_start = idx * self.block_shift;
            let out_end = (out_start + self.block_shift).min(out_file.len());
            let out_chunk_len = out_end - out_start;
            if out_chunk_len > 0 {
                out_file[out_start..out_end].copy_from_slice(&self.out_buffer[..out_chunk_len]);
            }
        }

        // Check for clipping and normalize if needed
        let max_val = out_file.iter().fold(0.0f32, |max, &x| max.max(x.abs()));
        if max_val > 1.0 {
            let scale = 0.99 / max_val;
            out_file.iter_mut().for_each(|x| *x *= scale);
        }

        Ok(out_file)
    }
}

// cargo test -p aec --no-default-features --features 128
// cargo test -p aec --no-default-features --features 256
// cargo test -p aec --no-default-features --features 512
// cargo bench -p aec --no-default-features --features 128
#[cfg(test)]
mod tests {
    use super::*;
    use dasp::sample::Sample;

    mod data {
        pub const DOUBLETALK_LPB: &[u8] = include_bytes!("../data/doubletalk_lpb_sample.wav");
        pub const DOUBLETALK_MIC: &[u8] = include_bytes!("../data/doubletalk_mic_sample.wav");

        pub const HYPRNOTE_LPB: &[u8] = include_bytes!("../data/hyprnote_lpb.wav");
        pub const HYPRNOTE_MIC: &[u8] = include_bytes!("../data/hyprnote_mic.wav");

        pub const THEO_LPB: &[u8] = include_bytes!("../data/theo_lpb.wav");
        pub const THEO_MIC: &[u8] = include_bytes!("../data/theo_mic.wav");
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

    macro_rules! aec_test {
        ($test_name:ident, $lpb_data:expr, $mic_data:expr, $output_prefix:literal) => {
            #[test]
            fn $test_name() {
                let feature = get_feature();

                let lpb_sample =
                    rodio::Decoder::new(std::io::BufReader::new(std::io::Cursor::new($lpb_data)))
                        .unwrap()
                        .collect::<Vec<_>>();

                let mic_sample =
                    rodio::Decoder::new(std::io::BufReader::new(std::io::Cursor::new($mic_data)))
                        .unwrap()
                        .collect::<Vec<_>>();

                let lpb_samples: Vec<f32> = lpb_sample.into_iter().map(|s| s.to_sample()).collect();
                let mic_samples: Vec<f32> = mic_sample.into_iter().map(|s| s.to_sample()).collect();

                {
                    let mut aec = AEC::new().unwrap();
                    let result = aec.process(&mic_samples, &lpb_samples).unwrap();
                    assert!(result.iter().all(|&x| x.is_finite()));

                    let mut file = hound::WavWriter::create(
                        format!("./{}_{}_batch.wav", $output_prefix, feature),
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

                {
                    let mut aec = AEC::new().unwrap();
                    let mut streaming_result = Vec::new();

                    // Ensure both samples have the same length (like in the original process method)
                    let len_audio = mic_samples.len().min(lpb_samples.len());
                    let mic_samples = &mic_samples[..len_audio];
                    let lpb_samples = &lpb_samples[..len_audio];

                    let chunk_size = model::BLOCK_SIZE * 2;
                    let mut processed = 0;

                    while processed < len_audio {
                        let end = (processed + chunk_size).min(len_audio);
                        let mic_chunk = &mic_samples[processed..end];
                        let lpb_chunk = &lpb_samples[processed..end];

                        let chunk_result = aec.process_streaming(mic_chunk, lpb_chunk).unwrap();
                        streaming_result.extend(chunk_result);

                        processed = end;
                    }

                    assert!(streaming_result.iter().all(|&x| x.is_finite()));

                    let mut file = hound::WavWriter::create(
                        format!("./{}_{}_streaming.wav", $output_prefix, feature),
                        hound::WavSpec {
                            channels: 1,
                            sample_rate: 16000,
                            bits_per_sample: 32,
                            sample_format: hound::SampleFormat::Float,
                        },
                    )
                    .unwrap();

                    for sample in streaming_result {
                        file.write_sample(sample).unwrap();
                    }
                    file.finalize().unwrap();
                }
            }
        };
    }

    aec_test!(
        test_aec_doubletalk,
        data::DOUBLETALK_LPB,
        data::DOUBLETALK_MIC,
        "doubletalk"
    );

    aec_test!(
        test_aec_hyprnote,
        data::HYPRNOTE_LPB,
        data::HYPRNOTE_MIC,
        "hyprnote"
    );

    aec_test!(test_aec_theo, data::THEO_LPB, data::THEO_MIC, "theo");
}
