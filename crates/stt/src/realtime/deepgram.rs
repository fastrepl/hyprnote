use bytes::Bytes;
use std::error::Error;

use deepgram::common::{
    options::{Encoding, Model, Options},
    stream_response::StreamResponse as DeepgramStreamResponse,
};
use futures_util::{future, Stream, StreamExt};

use super::RealtimeSpeechToText;
use hypr_listener_interface::{ListenOutputChunk, SpeakerIdentity, Word};

impl<S, E> RealtimeSpeechToText<S, E> for crate::deepgram::DeepgramClient {
    async fn transcribe(
        &mut self,
        stream: S,
    ) -> Result<
        Box<dyn Stream<Item = Result<ListenOutputChunk, crate::Error>> + Send + Unpin>,
        crate::Error,
    >
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let options = Options::builder()
            .model(Model::Nova2Meeting)
            .multichannel(false)
            .smart_format(true)
            .punctuate(true)
            .numerals(true)
            .language(self.language.clone())
            .filler_words(false)
            .diarize(true)
            .keywords(self.keywords.iter().map(String::as_str))
            .build();

        let deepgram_stream = self
            .client
            .transcription()
            .stream_request_with_options(options)
            .keep_alive()
            .sample_rate(16 * 1000)
            .channels(1)
            .encoding(Encoding::Linear16)
            .stream(stream)
            .await?;

        let filtered_stream = deepgram_stream.take_while(|result| {
            let continue_stream = match result {
                Ok(DeepgramStreamResponse::TerminalResponse { .. }) => false,
                _ => true,
            };
            future::ready(continue_stream)
        });

        let transformed_stream = filtered_stream.filter_map(move |result| {
            let item = match result {
                Err(e) => Some(Err(e.into())),
                Ok(resp) => match resp {
                    DeepgramStreamResponse::TranscriptResponse { channel, .. } => {
                        let data = channel.alternatives.first().unwrap();

                        if data.words.is_empty() {
                            None
                        } else {
                            let words: Vec<Word> = data
                                .words
                                .iter()
                                .map(|w| Word {
                                    text: w
                                        .punctuated_word
                                        .as_ref()
                                        .unwrap_or(&w.word)
                                        .trim()
                                        .to_string(),
                                    speaker: w
                                        .speaker
                                        .map(|s| SpeakerIdentity::Unassigned { index: s as u8 }),
                                    start_ms: Some((w.start * 1000.0) as u64),
                                    end_ms: Some((w.end * 1000.0) as u64),
                                    confidence: Some(w.confidence as f32),
                                })
                                .collect();

                            Some(Ok(ListenOutputChunk { words }))
                        }
                    }
                    _ => None,
                },
            };

            future::ready(item)
        });

        Ok(Box::from(Box::pin(transformed_stream)))
    }
}
