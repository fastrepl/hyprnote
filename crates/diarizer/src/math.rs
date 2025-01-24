use hypr_onnx::ndarray::{Array1, ArrayView1};

pub fn softmax(x: ArrayView1<f32>) -> Array1<f32> {
    let max_val = x.fold(f32::NEG_INFINITY, |a, &b| a.max(b));
    let exp_x = x.mapv(|val| (val - max_val).exp());
    let sum_exp = exp_x.sum();
    exp_x.mapv(|val| val / sum_exp)
}

pub fn argmax(x: ArrayView1<f32>) -> (f32, usize) {
    x.iter()
        .enumerate()
        .fold((f32::NEG_INFINITY, 0), |(max_val, max_idx), (idx, &val)| {
            if val > max_val {
                (val, idx)
            } else {
                (max_val, max_idx)
            }
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use hypr_onnx::ndarray::Array1;

    #[test]
    fn test_softmax() {
        // https://github.com/TheAlgorithms/Rust/blob/7903120b1397bfb73e8027ea42616c4849566e28/src/math/softmax.rs#L38C1-L56C2
        let test = Array1::from(vec![9.0, 0.5, -3.0, 0.0, 3.0]);
        let expected = Array1::from(vec![
            0.9971961,
            0.00020289792,
            6.126987e-6,
            0.00012306382,
            0.0024718025,
        ]);

        let result = softmax(test.view());
        result.iter().zip(expected.iter()).for_each(|(a, b)| {
            assert_relative_eq!(a, b, epsilon = 1e-6);
        });
    }

    #[test]
    fn test_argmax_simple() {
        let test = Array1::from(vec![1.0, 5.0, 2.0, 3.0, 4.0]);
        let (v, i) = argmax(test.view());
        assert_eq!(v, 5.0);
        assert_eq!(i, 1);
    }

    #[test]
    fn test_argmax_negative_numbers() {
        let test = Array1::from(vec![-3.0, -1.0, 4.0, -2.0]);
        let (v, i) = argmax(test.view());
        assert_eq!(v, 4.0);
        assert_eq!(i, 2);
    }

    #[test]
    fn test_argmax_first_occurrence() {
        let test = Array1::from(vec![3.0, 1.0, 3.0, 2.0]);
        let (v, i) = argmax(test.view());
        assert_eq!(v, 3.0);
        assert_eq!(i, 0);
    }
}
