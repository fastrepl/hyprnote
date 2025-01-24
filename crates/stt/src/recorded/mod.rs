use std::future::Future;

use anyhow::Result;

mod clova;
mod deepgram;

pub enum RecordedSpeech {
    Path(std::path::PathBuf),
}

#[allow(unused)]
pub trait RecordedSpeechToText {
    fn transcribe(&self, input: RecordedSpeech) -> impl Future<Output = Result<String>>;
}
