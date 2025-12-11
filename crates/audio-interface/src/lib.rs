use futures_util::Stream;

pub trait AsyncSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_;

    fn sample_rate(&self) -> u32;
}
