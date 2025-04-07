// https://github.com/tazz4843/whisper-rs/blob/master/examples/audio_transcription.rs

use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperState,
};

pub struct Whisper {
    state: WhisperState,
}

impl Whisper {
    pub fn new(model_path: impl AsRef<str>) -> Self {
        {
            unsafe extern "C" fn noop_callback(
                _level: whisper_rs::whisper_rs_sys::ggml_log_level,
                _text: *const ::std::os::raw::c_char,
                _user_data: *mut ::std::os::raw::c_void,
            ) {
            }
            unsafe { whisper_rs::set_log_callback(Some(noop_callback), std::ptr::null_mut()) };
        }

        let context_param = {
            let mut p = WhisperContextParameters::default();
            p.dtw_parameters.mode = whisper_rs::DtwMode::None;
            p
        };

        let ctx = WhisperContext::new_with_params(model_path.as_ref(), context_param).unwrap();
        let state = ctx.create_state().unwrap();

        Self { state }
    }

    pub fn transcribe(&mut self, audio: &[f32]) -> Vec<Segment> {
        let params = {
            let mut p = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
            p.set_n_threads(1);
            p.set_translate(false);
            p.set_language(Some("en"));

            p.set_print_special(false);
            p.set_print_progress(false);
            p.set_print_realtime(false);
            p.set_print_timestamps(false);

            p.set_token_timestamps(true);
            p.set_initial_prompt("");
            p.set_split_on_word(true);
            p.set_single_segment(false);
            p.set_suppress_blank(true);
            p.set_suppress_nst(true);
            p
        };

        self.state.full(params, &audio[..]).unwrap();
        let num_segments = self.state.full_n_segments().unwrap();

        let mut segments = Vec::new();
        for i in 0..num_segments {
            let text = self.state.full_get_segment_text(i).unwrap();
            let (start, end) = (
                self.state.full_get_segment_t0(i).unwrap(),
                self.state.full_get_segment_t1(i).unwrap(),
            );
            segments.push(Segment {
                text,
                start: start as f32 / 1000.0,
                end: end as f32 / 1000.0,
                // TODO
                confidence: 0.99,
            });
        }
        segments
    }
}

// https://github.com/floneum/floneum/blob/52967ae/models/rwhisper/src/lib.rs#L116
pub struct Segment {
    pub text: String,
    pub start: f32,
    pub end: f32,
    pub confidence: f32,
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    // https://github.com/utilityai/llama-cpp-rs/issues/484
    #[test]
    fn test_whisper() {
        let mut whisper = Whisper::new(concat!(env!("CARGO_MANIFEST_DIR"), "/model.bin"));

        let audio: Vec<f32> = hypr_data::english_1::AUDIO
            .chunks_exact(2)
            .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]) as f32 / 32768.0)
            .collect();

        let segments = whisper.transcribe(&audio);
        assert!(segments.len() > 0);
    }

    #[tokio::test]
    async fn test_whisper_with_llama() {
        let llama_path = dirs::data_dir()
            .unwrap()
            .join("com.hyprnote.dev")
            .join("llm.gguf");

        let llama = hypr_llama::Llama::new(llama_path).unwrap();
        let mut whisper = Whisper::new(concat!(env!("CARGO_MANIFEST_DIR"), "/model.bin"));

        let request = hypr_llama::LlamaRequest::new(vec![hypr_llama::LlamaChatMessage::new(
            "user".into(),
            "Generate a json array of 1 random objects, about animals".into(),
        )
        .unwrap()]);

        let response: String = llama.generate_stream(request).unwrap().collect().await;
        assert!(response.len() > 4);

        let audio: Vec<f32> = hypr_data::english_1::AUDIO
            .chunks_exact(2)
            .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]) as f32 / 32768.0)
            .take(16000 * 30)
            .collect();

        let segments = whisper.transcribe(&audio);
        assert!(segments.len() > 0);
    }
}
