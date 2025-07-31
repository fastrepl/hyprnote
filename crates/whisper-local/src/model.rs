// https://github.com/tazz4843/whisper-rs/blob/master/examples/audio_transcription.rs

use lazy_static::lazy_static;
use regex::Regex;

use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperState,
    WhisperToken,
};

use hypr_whisper::Language;

lazy_static! {
    static ref TRAILING_DOTS: Regex = Regex::new(r"\.{2,}$").unwrap();
}

#[derive(Default)]
pub struct WhisperBuilder {
    model_path: Option<String>,
    languages: Option<Vec<Language>>,
    static_prompt: Option<String>,
    dynamic_prompt: Option<String>,
}

impl WhisperBuilder {
    pub fn model_path(mut self, model_path: impl Into<String>) -> Self {
        self.model_path = Some(model_path.into());
        self
    }

    pub fn languages(mut self, languages: Vec<Language>) -> Self {
        self.languages = Some(languages);
        self
    }

    pub fn static_prompt(mut self, static_prompt: impl Into<String>) -> Self {
        self.static_prompt = Some(static_prompt.into());
        self
    }

    pub fn dynamic_prompt(mut self, dynamic_prompt: impl Into<String>) -> Self {
        self.dynamic_prompt = Some(dynamic_prompt.into());
        self
    }

    pub fn build(self) -> Whisper {
        unsafe { Self::suppress_log() };

        let context_param = {
            let mut p = WhisperContextParameters::default();
            p.gpu_device = 0;
            p.use_gpu = true;
            p.flash_attn = false; // crash on macos
            p.dtw_parameters.mode = whisper_rs::DtwMode::None;
            p
        };

        let model_path = self.model_path.unwrap();

        let ctx = WhisperContext::new_with_params(&model_path, context_param).unwrap();
        let state = ctx.create_state().unwrap();
        let token_eot = ctx.token_eot();
        let token_beg = ctx.token_beg();

        Whisper {
            languages: self.languages.unwrap_or_default(),
            static_prompt: self.static_prompt.unwrap_or_default(),
            dynamic_prompt: self.dynamic_prompt.unwrap_or_default(),
            state,
            token_eot,
            token_beg,
        }
    }

    unsafe fn suppress_log() {
        unsafe extern "C" fn noop_callback(
            _level: whisper_rs::whisper_rs_sys::ggml_log_level,
            _text: *const ::std::os::raw::c_char,
            _user_data: *mut ::std::os::raw::c_void,
        ) {
        }
        unsafe { whisper_rs::set_log_callback(Some(noop_callback), std::ptr::null_mut()) };
    }
}

pub struct Whisper {
    languages: Vec<Language>,
    static_prompt: String,
    dynamic_prompt: String,
    state: WhisperState,
    token_eot: WhisperToken,
    token_beg: WhisperToken,
}

impl Whisper {
    pub fn builder() -> WhisperBuilder {
        WhisperBuilder::default()
    }

    pub fn transcribe(&mut self, audio: &[f32]) -> Result<Vec<Segment>, super::Error> {
        let token_beg = self.token_beg;
        let language = self.get_language(audio)?;

        let params = {
            let mut p = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

            let parts = [self.static_prompt.trim(), self.dynamic_prompt.trim()];
            let joined = parts.join("\n");
            let initial_prompt = joined.trim();

            tracing::info!(initial_prompt = ?initial_prompt, "transcribe");

            p.set_translate(false);
            p.set_detect_language(false);
            p.set_language(language.as_deref());

            p.set_initial_prompt(&initial_prompt);

            unsafe {
                Self::suppress_beg(&mut p, &token_beg);
            }

            p.set_no_timestamps(true);
            p.set_token_timestamps(false);
            p.set_split_on_word(true);

            p.set_temperature(0.0);
            p.set_temperature_inc(0.2);

            p.set_single_segment(true);
            p.set_suppress_blank(true);
            p.set_suppress_nst(true);

            p.set_print_special(false);
            p.set_print_progress(false);
            p.set_print_realtime(false);
            p.set_print_timestamps(false);
            p
        };

        self.state.full(params, &audio[..])?;
        let num_segments = self.state.full_n_segments()?;

        let mut segments = Vec::new();
        for i in 0..num_segments {
            let text = TRAILING_DOTS
                .replace(&self.state.full_get_segment_text_lossy(i)?, "")
                .to_string();

            let (start, end) = (
                self.state.full_get_segment_t0(i)?,
                self.state.full_get_segment_t1(i)?,
            );
            let confidence = self.calculate_segment_confidence(i);

            segments.push(Segment {
                text,
                start: start as f32 / 1000.0,
                end: end as f32 / 1000.0,
                confidence,
                ..Default::default()
            });
        }

        let segments = Self::filter_segments(segments);

        let full_text = segments
            .iter()
            .map(|s| s.text())
            .collect::<Vec<&str>>()
            .join(" ");

        if !full_text.is_empty() {
            self.dynamic_prompt = full_text;
        }

        Ok(segments)
    }

    fn get_language(&mut self, audio: &[f32]) -> Result<Option<String>, super::Error> {
        if self.languages.len() == 0 {
            return Ok(None);
        }

        if self.languages.len() == 1 {
            let lang = &self.languages[0];
            return Ok(Some(lang.to_string()));
        }

        let lang_str = {
            self.state.pcm_to_mel(audio, 1)?;
            let (_lang_id, lang_probs) = self.state.lang_detect(0, 1)?;

            let mut best_lang = None;
            let mut best_prob = f32::NEG_INFINITY;

            for lang in &self.languages {
                let lang_id = lang.whisper_index();
                if lang_id < lang_probs.len() {
                    let prob = lang_probs[lang_id];
                    if prob > best_prob {
                        best_prob = prob;
                        best_lang = Some(lang.as_ref().to_string());
                    }
                }
            }

            best_lang
        };

        Ok(lang_str)
    }

    fn filter_segments(segments: Vec<Segment>) -> Vec<Segment> {
        segments
            .into_iter()
            .filter(|s| {
                let t = s.text.trim().to_lowercase();

                if s.confidence < 0.005
                    || t == "you"
                    || t == "thank you"
                    || t == "you."
                    || t == "thank you."
                    || t == "♪"
                {
                    false
                } else {
                    true
                }
            })
            .collect()
    }

    // https://github.com/ggml-org/whisper.cpp/pull/971/files#diff-2d3599a9fad195f2c3c60bd06691bc1815325b3560b5feda41a91fa71194e805R310-R327
    fn calculate_segment_confidence(&self, segment_idx: i32) -> f32 {
        let n_tokens = self.state.full_n_tokens(segment_idx).unwrap_or(0);
        if n_tokens == 0 {
            return 0.0;
        }

        let mut total_confidence = 0.0;
        let mut valid_tokens = 0;

        for j in 0..n_tokens {
            let token_id = match self.state.full_get_token_id(segment_idx, j) {
                Ok(id) => id,
                Err(_) => continue,
            };

            if token_id >= self.token_eot {
                continue;
            }

            let token_p = self
                .state
                .full_get_token_prob(segment_idx, j)
                .unwrap_or(0.0);

            let token_confidence = token_p.powi(3);

            total_confidence += token_confidence;
            valid_tokens += 1;
        }

        if valid_tokens == 0 {
            return 0.0;
        }

        total_confidence / valid_tokens as f32
    }

    unsafe fn suppress_beg(params: &mut FullParams, token_beg: &WhisperToken) {
        unsafe extern "C" fn logits_filter_callback(
            _ctx: *mut whisper_rs::whisper_rs_sys::whisper_context,
            _state: *mut whisper_rs::whisper_rs_sys::whisper_state,
            _tokens: *const whisper_rs::whisper_rs_sys::whisper_token_data,
            _n_tokens: std::os::raw::c_int,
            logits: *mut f32,
            user_data: *mut std::os::raw::c_void,
        ) {
            if logits.is_null() || user_data.is_null() {
                return;
            }

            let token_beg = *(user_data as *const WhisperToken);
            *logits.offset(token_beg as isize) = f32::NEG_INFINITY;
        }

        params.set_filter_logits_callback(Some(logits_filter_callback));
        params.set_filter_logits_callback_user_data(
            token_beg as *const WhisperToken as *mut std::ffi::c_void,
        );
    }
}

// https://github.com/floneum/floneum/blob/52967ae/models/rwhisper/src/lib.rs#L116
#[derive(Debug, Default)]
pub struct Segment {
    pub text: String,
    pub start: f32,
    pub end: f32,
    pub confidence: f32,
    pub meta: Option<serde_json::Value>,
}

impl Segment {
    pub fn text(&self) -> &str {
        &self.text
    }

    pub fn start(&self) -> f32 {
        self.start
    }

    pub fn end(&self) -> f32 {
        self.end
    }

    pub fn duration(&self) -> f32 {
        self.end - self.start
    }

    pub fn confidence(&self) -> f32 {
        self.confidence
    }

    pub fn meta(&self) -> Option<serde_json::Value> {
        self.meta.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[test]
    fn test_whisper() {
        let mut whisper = Whisper::builder()
            .model_path(concat!(env!("CARGO_MANIFEST_DIR"), "/model.bin"))
            .build();

        let audio: Vec<f32> = hypr_data::english_1::AUDIO
            .chunks_exact(2)
            .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]) as f32 / 32768.0)
            .collect();

        let segments = whisper.transcribe(&audio).unwrap();
        assert!(segments.len() > 0);
    }

    #[tokio::test]
    async fn test_whisper_with_llama() {
        let llama_path = dirs::data_dir()
            .unwrap()
            .join("com.hyprnote.dev")
            .join("hypr-llm.gguf");

        let llama = hypr_llama::Llama::new(llama_path).unwrap();

        let mut whisper = Whisper::builder()
            .model_path(concat!(env!("CARGO_MANIFEST_DIR"), "/model.bin"))
            .build();

        let request = hypr_llama::LlamaRequest {
            messages: vec![hypr_llama::LlamaChatMessage::new(
                "user".into(),
                "Generate a json array of 1 random objects, about animals".into(),
            )
            .unwrap()],
            ..Default::default()
        };

        let response: String = llama.generate_stream(request).unwrap().collect().await;
        assert!(response.len() > 4);

        let audio: Vec<f32> = hypr_data::english_1::AUDIO
            .chunks_exact(2)
            .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]) as f32 / 32768.0)
            .take(16000 * 30)
            .collect();

        let segments = whisper.transcribe(&audio).unwrap();
        assert!(segments.len() > 0);
    }
}
