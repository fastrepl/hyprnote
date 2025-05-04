use bytes::Bytes;
use futures_util::{Stream, StreamExt};
use std::error::Error;

use hypr_whisper::cloud::WhisperClient;

use super::RealtimeSpeechToText;
use hypr_listener_interface::{ListenOutputChunk, TranscriptChunk};

impl<S, E> RealtimeSpeechToText<S, E> for WhisperClient {
    async fn transcribe(
        &mut self,
        audio: S,
    ) -> Result<
        Box<dyn Stream<Item = Result<ListenOutputChunk, crate::Error>> + Send + Unpin>,
        crate::Error,
    >
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let audio_stream = Box::pin(audio.filter_map(|chunk| async { chunk.ok() }));
        let s1 = self.from_audio(audio_stream).await.unwrap();
        let s2 = s1.map(|output| {
            Ok(ListenOutputChunk {
                transcripts: vec![TranscriptChunk {
                    text: output.text,
                    start: 0,
                    end: 0,
                    confidence: None,
                }],
                diarizations: vec![],
            })
        });

        Ok(Box::from(Box::pin(s2)))
    }
}
