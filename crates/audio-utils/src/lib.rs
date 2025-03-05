use bytes::{BufMut, Bytes, BytesMut};
use futures_util::{Stream, StreamExt};
use kalosm_sound::AsyncSource;

impl<T: AsyncSource> AudioFormatExt for T {}

pub trait AudioFormatExt: AsyncSource {
    fn to_i16_le_chunks(
        self,
        sample_rate: u32,
        chunk_size: usize,
    ) -> impl Stream<Item = Bytes> + Send + Unpin
    where
        Self: Sized + Send + Unpin + 'static,
    {
        self.resample(sample_rate).chunks(chunk_size).map(|chunk| {
            let mut buf = BytesMut::with_capacity(chunk.len() * 2);
            for sample in chunk {
                buf.put_i16_le(sample as i16);
            }
            buf.freeze()
        })
    }
}
