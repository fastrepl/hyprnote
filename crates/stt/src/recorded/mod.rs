use anyhow::Result;
use std::path::PathBuf;

#[allow(unused)]
pub trait RecordedSpeechToText {
    fn transcribe(&self, file: PathBuf) -> Result<String>;
}
