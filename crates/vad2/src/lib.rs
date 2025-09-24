use std::ops::{Deref, DerefMut};
use ten_vad_rs::{TenVad, TenVadError};

pub struct Vad {
    inner: TenVad,
}

const MODEL_BYTES: &[u8] = include_bytes!("../assets/model.onnx");

impl Vad {
    pub fn new() -> Result<Self, TenVadError> {
        let inner = TenVad::new_from_bytes(MODEL_BYTES, 16000)?;
        Ok(Self { inner })
    }
}

impl Deref for Vad {
    type Target = TenVad;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl DerefMut for Vad {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}
