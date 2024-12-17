mod generated;

pub use generated::*;
pub use protobuf;

#[cfg(test)]
mod tests {
    use super::v0::*;
    use protobuf::Message;

    #[test]
    fn test_encode_and_decode() {
        let mut input_chunk = TranscribeInputChunk::new();
        input_chunk.audio = bytes::Bytes::from("test audio data");

        let mut buf = Vec::new();
        input_chunk.write_to_writer(&mut buf).unwrap();
        let encoded = bytes::Bytes::from(buf);
        let decoded = TranscribeInputChunk::parse_from_bytes(&encoded).unwrap();

        assert_eq!(input_chunk.audio, decoded.audio);

        let mut input_chunk_2 = TranscribeInputChunk::new();
        input_chunk_2.audio = bytes::Bytes::from("test audio data 2");

        assert_ne!(input_chunk_2.audio, decoded.audio);
    }
}
