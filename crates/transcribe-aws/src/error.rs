#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    GenericError(#[from] aws_sdk_transcribestreaming::Error),
    #[error(transparent)]
    TranscriptResultStreamError(
        #[from]
        aws_smithy_runtime_api::client::result::SdkError<
            aws_sdk_transcribestreaming::types::error::TranscriptResultStreamError,
            aws_smithy_types::event_stream::RawMessage,
        >,
    ),
    #[error(transparent)]
    StartStreamTranscriptionError(
        #[from]
        aws_smithy_runtime_api::client::result::SdkError<
            aws_sdk_transcribestreaming::operation::start_stream_transcription::StartStreamTranscriptionError,
            aws_smithy_runtime_api::client::orchestrator::HttpResponse,
        >,
    ),
}
