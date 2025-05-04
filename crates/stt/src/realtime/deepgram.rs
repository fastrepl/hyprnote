use bytes::Bytes;
use std::error::Error;

use deepgram::common::{
    options::{Encoding, Model, Options},
    stream_response::StreamResponse as DeepgramStreamResponse,
};
use futures_util::{future, Stream, StreamExt};

use super::RealtimeSpeechToText;
use hypr_listener_interface::{DiarizationChunk, ListenOutputChunk, TranscriptChunk};

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

        let transformed_stream = deepgram_stream.filter_map(move |result| {
            let item = match result {
                Err(e) => Some(Err(e.into())),
                Ok(resp) => match resp {
                    DeepgramStreamResponse::TranscriptResponse { channel, .. } => {
                        let data = channel.alternatives.first().unwrap();

                        if data.words.is_empty() {
                            None
                        } else {
                            let mut diarizations = Vec::new();
                            let mut transcripts = Vec::new();

                            for w in &data.words {
                                let word_text = w.punctuated_word.as_ref().unwrap_or(&w.word);

                                transcripts.push(TranscriptChunk {
                                    text: word_text.clone(),
                                    start: (w.start * 1000.0) as u64,
                                    end: (w.end * 1000.0) as u64,
                                    confidence: None,
                                });

                                if let Some(speaker) = w.speaker {
                                    diarizations.push(DiarizationChunk {
                                        speaker,
                                        start: (w.start * 1000.0) as u64,
                                        end: (w.end * 1000.0) as u64,
                                        confidence: None,
                                    });
                                }
                            }

                            Some(Ok(ListenOutputChunk {
                                diarizations,
                                transcripts,
                            }))
                        }
                    }
                    DeepgramStreamResponse::TerminalResponse { .. }
                    | DeepgramStreamResponse::SpeechStartedResponse { .. }
                    | DeepgramStreamResponse::UtteranceEndResponse { .. } => None,
                    _ => None,
                },
            };

            future::ready(item)
        });

        Ok(Box::from(Box::pin(transformed_stream)))
    }
}
