use anyhow::Result;

use deepgram::common::{
    audio_source::AudioSource,
    options::{Model, Options},
};

use super::{RecordedSpeech, RecordedSpeechToText};

// https://github.com/deepgram/deepgram-rust-sdk/blob/73e5385/examples/transcription/rest/prerecorded_from_url.rs
impl RecordedSpeechToText for crate::deepgram::DeepgramClient {
    async fn transcribe(&self, _input: RecordedSpeech) -> Result<String> {
        let source = AudioSource::from_url("123");
        let options = Options::builder().model(Model::Nova2).build();

        let response = self
            .client
            .transcription()
            .prerecorded(source, &options)
            .await
            .unwrap();

        let result = response
            .results
            .channels
            .first()
            .unwrap()
            .alternatives
            .first()
            .unwrap();

        let _words = result.words.iter().map(|w| w.word);

        Ok("".to_string())
    }
}
