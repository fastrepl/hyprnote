pub use kalosm_sound::{MicInput, MicStream};

#[cfg(target_os = "macos")]
pub fn listener() {
    use cidre::{core_audio as ca, os};

    extern "C-unwind" fn callback(
        _obj_id: ca::Obj,
        _number_addresses: u32,
        _addresses: *const ca::PropAddr,
        client_data: *mut usize,
    ) -> os::Status {
        unsafe { client_data.write(1) };
        os::Status::NO_ERR
    }

    let mut data = 0;

    ca::System::OBJ
        .add_prop_listener(
            &ca::PropSelector::HW_DEFAULT_INPUT_DEVICE.global_addr(),
            callback,
            &mut data,
        )
        .unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    async fn test_mic() {
        let mic = MicInput::default();
        let mut stream = mic.stream();

        let mut buffer = Vec::new();
        while let Some(sample) = stream.next().await {
            buffer.push(sample);
            if buffer.len() > 6000 {
                break;
            }
        }

        assert!(buffer.iter().any(|x| *x != 0.0));
    }
}
