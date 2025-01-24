use anyhow::Result;
use std::path::PathBuf;

use super::RecordedSpeechToText;

// https://github.com/deepgram/deepgram-rust-sdk/blob/73e5385/examples/transcription/rest/prerecorded_from_url.rs
impl RecordedSpeechToText for crate::deepgram::DeepgramClient {
    fn transcribe(&self, _: PathBuf) -> Result<String> {
        todo!()
    }
}
