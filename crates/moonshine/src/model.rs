use std::collections::HashMap;

use hypr_onnx::{
    ndarray::{self, Array1, Array2, ArrayD, IxDyn},
    ort::{
        session::{Session, SessionInputValue, SessionInputs},
        value::Value,
    },
};

use crate::Error;
use owhisper_config::MoonshineModelSize;

pub struct MoonshineOnnxModel {
    encoder: Session,
    decoder: Session,
    tokenizer: tokenizers::Tokenizer,

    num_layers: usize,
    num_key_value_heads: usize,
    head_dim: usize,

    decoder_start_token_id: i64,
    eos_token_id: i64,
}

impl MoonshineOnnxModel {
    pub fn new(
        encoder_path: impl AsRef<std::path::Path>,
        decoder_path: impl AsRef<std::path::Path>,
        tokenizer_path: impl AsRef<std::path::Path>,
        model_size: MoonshineModelSize,
    ) -> Result<Self, Error> {
        let encoder = hypr_onnx::load_model_from_path(encoder_path)?;
        let decoder = hypr_onnx::load_model_from_path(decoder_path)?;

        let tokenizer = tokenizers::Tokenizer::from_file(tokenizer_path)
            .map_err(|e| Error::TokenizerLoad(e.to_string()))?;

        let (num_layers, num_key_value_heads, head_dim) = match model_size {
            MoonshineModelSize::Tiny => (6, 8, 36),
            MoonshineModelSize::Base => (8, 8, 52),
        };

        Ok(Self {
            encoder,
            decoder,
            tokenizer,
            num_layers,
            num_key_value_heads,
            head_dim,
            decoder_start_token_id: 1,
            eos_token_id: 2,
        })
    }

    pub fn transcribe(&mut self, audio_samples: Vec<f32>) -> Result<String, Error> {
        let audio = Array2::from_shape_vec((1, audio_samples.len()), audio_samples)
            .map_err(|e| Error::Shape(format!("failed to create audio array: {e}")))?;

        let tokens = self.generate(audio)?;
        self.decode(&tokens)
    }

    fn generate(&mut self, audio: Array2<f32>) -> Result<Vec<i64>, Error> {
        let num_samples = audio.shape().get(1).copied().unwrap_or(0);

        let mut enc_outputs = {
            let audio_value = Value::from_array(audio)?;
            let enc_inputs =
                SessionInputs::from(vec![("input_values", SessionInputValue::from(audio_value))]);
            self.encoder.run(enc_inputs)?
        };

        let output_names: Vec<String> = enc_outputs.keys().map(|k| k.to_string()).collect();
        if output_names.is_empty() {
            return Err(Error::Shape("encoder produced no outputs".into()));
        }

        let last_hidden_state_value = enc_outputs
            .remove(&output_names[0])
            .ok_or_else(|| Error::Shape("failed to get encoder output".into()))?;

        let (shape, data) = last_hidden_state_value
            .try_extract_tensor::<f32>()
            .map_err(|_| Error::Shape("failed to extract encoder output as f32 tensor".into()))?;

        let shape_vec: Vec<usize> = shape.iter().map(|&x| x as usize).collect();
        if shape_vec.len() != 3 {
            return Err(Error::Shape(format!(
                "expected 3D tensor, got {:?}",
                shape_vec
            )));
        }
        let last_hidden_state = ndarray::Array3::from_shape_vec(
            (shape_vec[0], shape_vec[1], shape_vec[2]),
            data.to_vec(),
        )
        .map_err(|e| Error::Shape(format!("failed to create array3: {e}")))?;

        // Build initial past_key_values with zeros
        let mut past: HashMap<String, Value> = HashMap::new();
        for i in 0..self.num_layers {
            for a in ["decoder", "encoder"] {
                for b in ["key", "value"] {
                    let key = format!("past_key_values.{i}.{a}.{b}");
                    let zeros: ArrayD<f32> =
                        ArrayD::zeros(IxDyn(&[0, self.num_key_value_heads, 1, self.head_dim]));
                    let value = Value::from_array(zeros)?;
                    past.insert(key, value.into_dyn());
                }
            }
        }

        let mut tokens: Vec<i64> = vec![self.decoder_start_token_id];
        let mut input_ids =
            ndarray::Array2::from_shape_vec((1, 1), vec![self.decoder_start_token_id])
                .map_err(|e| Error::Shape(format!("input_ids init: {e}")))?;

        for i in 0..num_samples {
            let use_cache_branch = i > 0;

            // Build decoder inputs
            let mut dec_input_vec: Vec<(&str, SessionInputValue)> = vec![];

            dec_input_vec.push((
                "input_ids",
                SessionInputValue::from(Value::from_array(input_ids.clone())?),
            ));
            dec_input_vec.push((
                "encoder_hidden_states",
                SessionInputValue::from(Value::from_array(last_hidden_state.clone())?),
            ));

            let ucb = Array1::from_vec(vec![use_cache_branch]);
            dec_input_vec.push((
                "use_cache_branch",
                SessionInputValue::from(Value::from_array(ucb)?),
            ));

            // Add past key values
            let past_keys: Vec<String> = past.keys().cloned().collect();
            for k in past_keys {
                if let Some(v) = past.get(&k) {
                    let (shape, data) = v
                        .try_extract_tensor::<f32>()
                        .map_err(|_| Error::Shape("failed to extract past kv tensor".into()))?;
                    let shape_vec: Vec<usize> = shape.iter().map(|&x| x as usize).collect();
                    let tensor =
                        ArrayD::from_shape_vec(IxDyn(&shape_vec), data.to_vec()).map_err(|e| {
                            Error::Shape(format!("failed to recreate past tensor: {e}"))
                        })?;
                    let new_value = Value::from_array(tensor)?.into_dyn();
                    let leaked_key = Box::leak(k.clone().into_boxed_str());
                    dec_input_vec.push((leaked_key, SessionInputValue::from(new_value)));
                }
            }

            let dec_inputs = SessionInputs::from(dec_input_vec);
            let outputs = self.decoder.run(dec_inputs)?;

            // Get decoder outputs
            let mut dec_outputs = outputs;
            let output_names: Vec<String> = dec_outputs.keys().map(|k| k.to_string()).collect();

            if output_names.is_empty() {
                return Err(Error::Shape("decoder produced no outputs".into()));
            }

            let logits_value = dec_outputs
                .remove(&output_names[0])
                .ok_or_else(|| Error::Shape("failed to get logits output".into()))?;

            let (shape, data) = logits_value
                .try_extract_tensor::<f32>()
                .map_err(|_| Error::Shape("failed to extract logits as f32 tensor".into()))?;

            let shape_vec: Vec<usize> = shape.iter().map(|&x| x as usize).collect();
            if shape_vec.len() != 3 {
                return Err(Error::Shape(format!(
                    "expected 3D logits, got {:?}",
                    shape_vec
                )));
            }
            let logits = ndarray::Array3::from_shape_vec(
                (shape_vec[0], shape_vec[1], shape_vec[2]),
                data.to_vec(),
            )
            .map_err(|e| Error::Shape(format!("failed to create logits array3: {e}")))?;

            // argmax over vocab at last position
            let last_pos = logits.shape()[1] - 1;
            let logit_slice = logits.slice(ndarray::s![0, last_pos, ..]).to_owned();

            let next = argmax_1d(logit_slice);
            tokens.push(next);

            if next == self.eos_token_id {
                break;
            }

            // prepare next iteration
            input_ids = ndarray::Array2::from_shape_vec((1, 1), vec![next])
                .map_err(|e| Error::Shape(format!("input_ids next: {e}")))?;

            // Update past key values from outputs
            let past_keys: Vec<String> = past.keys().cloned().collect();
            for past_key in past_keys {
                let present_key = past_key.replace("past_key_values.", "present.");

                if let Some(present_value) = dec_outputs.remove(&present_key) {
                    let should_update = !use_cache_branch || past_key.contains(".decoder.");
                    if should_update {
                        past.insert(past_key, present_value.into_dyn());
                    }
                }
            }
        }

        Ok(tokens)
    }

    fn decode(&self, tokens: &[i64]) -> Result<String, Error> {
        let tokens_to_decode = if !tokens.is_empty() && tokens[0] == self.decoder_start_token_id {
            &tokens[1..]
        } else {
            tokens
        };

        let token_ids: Vec<u32> = tokens_to_decode
            .iter()
            .filter(|&&t| t != self.eos_token_id)
            .map(|&t| t as u32)
            .collect();

        self.tokenizer
            .decode(&token_ids, true)
            .map_err(|e| Error::Other(format!("Decode error: {}", e)))
    }
}

fn argmax_1d(v: Array1<f32>) -> i64 {
    let mut max_idx = 0usize;
    let mut max_val = f32::NEG_INFINITY;
    for (i, val) in v.iter().enumerate() {
        if *val > max_val {
            max_val = *val;
            max_idx = i;
        }
    }
    max_idx as i64
}

#[cfg(test)]
mod tests {
    use super::*;
    use rodio::Source;

    #[test]
    fn test_transcribe() {
        let tiny_base = dirs::cache_dir()
            .unwrap()
            .join("com.fastrepl.owhisper")
            .join("moonshine-onnx-tiny");

        let mut model = MoonshineOnnxModel::new(
            tiny_base.join("encoder_model.onnx"),
            tiny_base.join("decoder_model_merged.onnx"),
            tiny_base.join("tokenizer.json"),
            MoonshineModelSize::Tiny,
        )
        .unwrap();

        let decoder = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let samples: Vec<f32> = decoder.convert_samples::<f32>().collect();

        let start_idx = 50000;
        let segment_len = 16000 * 15;
        let end_idx = (start_idx + segment_len).min(samples.len());
        let segment = samples[start_idx..end_idx].to_vec();

        let out = model.transcribe(segment).unwrap();
        println!("{}", out);
    }
}
