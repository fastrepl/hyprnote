pub struct ReceiverStreamSource {
    stream: tokio_stream::wrappers::ReceiverStream<f32>,
    sample_rate: u32,
}

impl ReceiverStreamSource {
    pub fn new(rx: tokio::sync::mpsc::Receiver<f32>, sample_rate: u32) -> Self {
        Self {
            stream: tokio_stream::wrappers::ReceiverStream::new(rx),
            sample_rate,
        }
    }
}

impl futures_core::Stream for ReceiverStreamSource {
    type Item = f32;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        let this = self.get_mut();
        std::pin::Pin::new(&mut this.stream).poll_next(cx)
    }
}

impl crate::AsyncSource for ReceiverStreamSource {
    fn as_stream(&mut self) -> impl futures_core::Stream<Item = f32> + '_ {
        &mut self.stream
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}
