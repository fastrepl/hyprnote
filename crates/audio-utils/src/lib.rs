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
            let n = std::mem::size_of::<f32>() * chunk.len();

            let mut buf = BytesMut::with_capacity(n);
            for sample in chunk {
                let scaled = (sample * std::i16::MAX as f32)
                    .clamp(std::i16::MIN as f32, std::i16::MAX as f32);
                buf.put_i16_le(scaled as i16);
            }
            buf.freeze()
        })
    }
}

pub fn i16_to_f32_samples(samples: &[i16]) -> Vec<f32> {
    samples
        .iter()
        .map(|&sample| sample as f32 / std::i16::MAX as f32)
        .collect()
}

pub fn f32_to_i16_samples(samples: &[f32]) -> Vec<i16> {
    samples
        .iter()
        .map(|&sample| {
            let scaled =
                (sample * std::i16::MAX as f32).clamp(std::i16::MIN as f32, std::i16::MAX as f32);
            scaled as i16
        })
        .collect()
}
