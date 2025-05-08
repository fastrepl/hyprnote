use cidre::{core_audio as ca, io, os};

#[derive(Default)]
pub struct Detector {}

const DEVICE_IS_RUNNING_SOMEWHERE: ca::PropAddr = ca::PropAddr {
    selector: ca::PropSelector::DEVICE_IS_RUNNING_SOMEWHERE,
    scope: ca::PropScope::GLOBAL,
    element: ca::PropElement::MAIN,
};

impl crate::Observer for Detector {
    fn start(&mut self, f: crate::DetectCallback) {
        extern "C-unwind" fn listener(
            _obj_id: ca::Obj,
            number_addresses: u32,
            addresses: *const ca::PropAddr,
            _client_data: *mut (),
        ) -> os::Status {
            let addresses =
                unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

            for addr in addresses {
                match addr.selector {
                    ca::PropSelector::HW_DEFAULT_INPUT_DEVICE => {
                        println!("default input device changed");
                        let device = ca::System::default_input_device().unwrap();

                        let is_running = device.prop::<u8>(&DEVICE_IS_RUNNING_SOMEWHERE).unwrap();
                        println!("is_running: {is_running}");
                    }
                    ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE => {
                        println!("default output device changed");
                        let device = ca::System::default_output_device().unwrap();

                        let streams = device.streams().unwrap();
                        let headphones = streams
                            .iter()
                            .find(|s| {
                                let term_type = s.terminal_type().unwrap();
                                term_type.0 == io::audio::output_term::HEADPHONES
                                    || term_type == ca::StreamTerminalType::HEADPHONES
                            })
                            .is_some();
                        println!("headphones connected {headphones}");
                    }
                    _ => panic!("unregistered selector"),
                }
            }
            os::Status::NO_ERR
        }
    }
    fn stop(&mut self) {}
}
