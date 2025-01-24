use anyhow::Result;
use std::path::PathBuf;

use super::RecordedSpeechToText;

// TODO: we need generic clova client
impl RecordedSpeechToText for hypr_clova::realtime::Client {
    fn transcribe(&self, _: PathBuf) -> Result<String> {
        todo!()
    }
}
