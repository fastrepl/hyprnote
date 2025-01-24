use anyhow::Result;

use super::{RecordedSpeech, RecordedSpeechToText};

impl RecordedSpeechToText for hypr_clova::realtime::Client {
    async fn transcribe(&self, _input: RecordedSpeech) -> Result<String> {
        todo!()
    }
}
