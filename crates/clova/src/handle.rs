// https://api.ncloud-docs.com/docs/ko/ai-application-service-clovaspeech-grpc
// https://api.ncloud-docs.com/docs/en/ai-application-service-clovaspeech-grpc

use anyhow::Result;

#[derive(Debug, Clone)]
enum WsMessage {
    Audio(Audio),
    ControlMessage(ControlMessage),
}

#[derive(Debug, Clone)]
enum ControlMessage {
    Finalize,
    KeepAlive,
    CloseStream,
}

#[derive(Debug, Clone)]
struct Audio(Vec<u8>);

struct StreamResponse {}

#[derive(Debug)]
pub struct Handle {}

impl Handle {
    async fn new() -> Result<Handle> {
        Ok(Handle {})
    }
}
