use anyhow::Result;

use super::{RecordedSpeech, RecordedSpeechToText};

impl RecordedSpeechToText for hypr_clova::recorded::Client {
    async fn transcribe(&self, input: RecordedSpeech) -> Result<String> {
        let res = match input {
            RecordedSpeech::File(file_path) => self.transcribe_local_file(file_path).await?,
            _ => panic!("Unsupported input type"),
        };

        Ok(res.segment.into_iter().map(|s| s.text).collect())
    }
}
