mod error;

pub use error::*;

#[allow(unused)]
use hypr_onnx::{
    load_model, ndarray as nd,
    ort::{session::Session, value::Tensor},
};

#[allow(unused)]
use realfft::{num_complex::Complex, ComplexToReal, RealFftPlanner, RealToComplex};

const MODEL_1_BYTES: &[u8] = include_bytes!("../data/model_1.onnx");
const MODEL_2_BYTES: &[u8] = include_bytes!("../data/model_2.onnx");

#[allow(unused)]
const BLOCK_LEN: usize = 512;

#[allow(unused)]
const BLOCK_SHIFT: usize = 128;

#[allow(unused)]
pub struct DTLN {
    model_1: Session,
    model_2: Session,
}

impl DTLN {
    pub fn new() -> Result<Self, crate::Error> {
        Ok(Self {
            model_1: load_model(&MODEL_1_BYTES)?,
            model_2: load_model(&MODEL_2_BYTES)?,
        })
    }

    // https://github.com/breizhn/DTLN-aec/blob/main/run_aec.py
    pub fn process(&self, input: &[f32]) -> Result<Vec<f32>, crate::Error> {
        Ok(vec![0.0; input.len()])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dtln() {
        let _dtln = DTLN::new().unwrap();
    }
}
