use cpal::traits::{DeviceTrait, HostTrait};

fn main() {
    println!("Simple microphone test...");

    let host = cpal::default_host();

    let default_device = host.default_input_device();
    println!(
        "Default input device: {:?}",
        default_device.as_ref().and_then(|d| d.name().ok())
    );

    if let Some(device) = default_device {
        let config = device.default_input_config().expect("failed to get default input config");
        println!("Success! Config: {:?}", config);
    } else {
        println!("No default input device available");
    }

    println!("\nEnumerating input devices:");
    let devices = host.input_devices().expect("failed to enumerate devices");
    let device_list: Vec<_> = devices.collect();
    println!("Found {} devices", device_list.len());
    for (i, device) in device_list.iter().enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".to_string());
        println!("  {}: {}", i, name);
    }
}
