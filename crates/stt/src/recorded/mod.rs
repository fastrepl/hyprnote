use anyhow::Result;
use std::path::PathBuf;

mod clova;
mod deepgram;

#[allow(unused)]
pub trait RecordedSpeechToText {
    fn transcribe(&self, file: PathBuf) -> Result<String>;
}
