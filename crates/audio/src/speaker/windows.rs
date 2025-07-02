use futures_util::Stream;

pub struct SpeakerInput {}

impl SpeakerInput {
    pub fn new(_sample_rate_override: Option<u32>) -> Self {
        Self {}
    }

    pub fn stream(self) -> SpeakerStream {
        SpeakerStream::new()
    }
}

pub struct SpeakerStream {}

impl SpeakerStream {
    pub fn new() -> Self {
        Self {}
    }

    pub fn sample_rate(&self) -> u32 {
        16000
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        _cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        std::task::Poll::Ready(Some(0.0))
    }
}
