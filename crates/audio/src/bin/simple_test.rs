use cpal::traits::{DeviceTrait, HostTrait};

fn main() {
    println!("Simple microphone test...");

    let host = cpal::default_host();

    // Try to get the default input device
    let default_device = host.default_input_device();
    println!("Default input device: {:?}", default_device.as_ref().and_then(|d| d.name().ok()));

    if let Some(device) = default_device {
        println!("Trying to get default input config...");
        match device.default_input_config() {
            Ok(config) => {
                println!("Success! Config: {:?}", config);
            },
            Err(e) => {
                println!("Failed to get default input config: {:?}", e);
            }
        }
    } else {
        println!("No default input device available");
    }

    // Try to enumerate devices
    println!("\nEnumerating input devices:");
    match host.input_devices() {
        Ok(devices) => {
            let device_list: Vec<_> = devices.collect();
            println!("Found {} devices", device_list.len());
            for (i, device) in device_list.iter().enumerate() {
                match device.name() {
                    Ok(name) => println!("  {}: {}", i, name),
                    Err(e) => println!("  {}: Error getting name: {:?}", i, e),
                }
            }
        },
        Err(e) => {
            println!("Failed to enumerate devices: {:?}", e);
        }
    }
}