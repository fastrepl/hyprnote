use anyhow::Result;
use candle::{Device, Tensor};
use std::path::Path;

use crate::config::Config;

pub struct Model {
    state: moshi::asr::State,
    text_tokenizer: sentencepiece::SentencePieceProcessor,
    timestamps: bool,
    vad: bool,
    config: Config,
    dev: Device,
}

impl Model {
    pub fn load(
        config_path: &Path,
        model_path: &Path,
        tokenizer_path: &Path,
        mimi_path: &Path,
        timestamps: bool,
        vad: bool,
        dev: &Device,
    ) -> Result<Self> {
        let dtype = dev.bf16_default_to_f32();

        let config: Config = serde_json::from_str(&std::fs::read_to_string(config_path)?)?;
        let text_tokenizer = sentencepiece::SentencePieceProcessor::open(tokenizer_path)?;
        let vb_lm =
            unsafe { candle_nn::VarBuilder::from_mmaped_safetensors(&[model_path], dtype, dev)? };
        let audio_tokenizer = moshi::mimi::load(mimi_path.to_str().unwrap(), Some(32), dev)?;
        let lm = moshi::lm::LmModel::new(
            &config.model_config(vad),
            moshi::nn::MaybeQuantizedVarBuilder::Real(vb_lm),
        )?;
        let asr_delay_in_tokens = (config.stt_config.audio_delay_seconds * 12.5) as usize;
        let state = moshi::asr::State::new(1, asr_delay_in_tokens, 0., audio_tokenizer, lm)?;
        Ok(Model {
            state,
            config,
            text_tokenizer,
            timestamps,
            vad,
            dev: dev.clone(),
        })
    }

    pub fn run(&mut self, mut pcm: Vec<f32>) -> Result<()> {
        use std::io::Write;

        if self.config.stt_config.audio_silence_prefix_seconds > 0.0 {
            let silence_len =
                (self.config.stt_config.audio_silence_prefix_seconds * 24000.0) as usize;
            pcm.splice(0..0, vec![0.0; silence_len]);
        }
        let suffix = (self.config.stt_config.audio_delay_seconds * 24000.0) as usize;
        pcm.resize(pcm.len() + suffix + 24000, 0.0);

        let mut last_word = None;
        let mut printed_eot = false;
        for pcm in pcm.chunks(1920) {
            let pcm = Tensor::new(pcm, &self.dev)?.reshape((1, 1, ()))?;
            let asr_msgs = self.state.step_pcm(pcm, None, &().into(), |_, _, _| ())?;
            for asr_msg in asr_msgs.iter() {
                match asr_msg {
                    moshi::asr::AsrMsg::Step { prs, .. } => {
                        if self.vad && prs[2][0] > 0.5 && !printed_eot {
                            printed_eot = true;
                            if !self.timestamps {
                                print!(" <endofturn pr={}>", prs[2][0]);
                            } else {
                                println!("<endofturn pr={}>", prs[2][0]);
                            }
                        }
                    }
                    moshi::asr::AsrMsg::EndWord { stop_time, .. } => {
                        printed_eot = false;
                        if self.timestamps {
                            if let Some((word, start_time)) = last_word.take() {
                                println!("[{start_time:5.2}-{stop_time:5.2}] {word}");
                            }
                        }
                    }
                    moshi::asr::AsrMsg::Word {
                        tokens, start_time, ..
                    } => {
                        printed_eot = false;
                        let word = self
                            .text_tokenizer
                            .decode_piece_ids(tokens)
                            .unwrap_or_else(|_| String::new());
                        if !self.timestamps {
                            print!(" {word}");
                            std::io::stdout().flush()?
                        } else {
                            if let Some((word, prev_start_time)) = last_word.take() {
                                println!("[{prev_start_time:5.2}-{start_time:5.2}] {word}");
                            }
                            last_word = Some((word, *start_time));
                        }
                    }
                }
            }
        }
        if let Some((word, start_time)) = last_word.take() {
            println!("[{start_time:5.2}-     ] {word}");
        }
        println!();
        Ok(())
    }
}
