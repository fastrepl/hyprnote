use audio::AudioInput;

fn main() {
    // Print device enumeration diagnostics to stdout
    println!("Testing friendly device name enumeration...\n");

    // Test microphone devices
    println!("=== Microphone Devices ===");
    let mic_devices = AudioInput::list_mic_devices();
    println!("Found {} microphone devices:", mic_devices.len());
    for (i, name) in mic_devices.iter().enumerate() {
        println!("  {}: {}", i, name);
    }

    println!("\n=== Microphone Devices (with info) ===");
    let mic_devices_info = AudioInput::list_mic_devices_info();
    for device_info in mic_devices_info {
        println!(
            "  {} - Available: {}, Default: {}",
            device_info.name, device_info.is_available, device_info.is_default
        );
    }

    // Test speaker devices
    println!("\n=== Speaker Devices ===");
    let speaker_devices = AudioInput::list_speaker_devices();
    println!("Found {} speaker devices:", speaker_devices.len());
    for (i, name) in speaker_devices.iter().enumerate() {
        println!("  {}: {}", i, name);
    }

    println!("\n=== Speaker Devices (with info) ===");
    let speaker_devices_info = AudioInput::list_speaker_devices_info();
    for device_info in speaker_devices_info {
        println!(
            "  {} - Available: {}, Default: {}",
            device_info.name, device_info.is_available, device_info.is_default
        );
    }

    // Test creating a microphone input with the first available device
    if !mic_devices.is_empty() {
        println!("\n=== Testing Device Selection ===");
        let device_name = mic_devices[0].clone();
        println!(
            "Attempting to create AudioInput with device: {}",
            device_name
        );

        match AudioInput::from_mic(Some(device_name.clone())) {
            Ok(input) => {
                println!("Success! Device name: {}", input.device_name());
            }
            Err(e) => {
                println!("Failed to create AudioInput: {:?}", e);
            }
        }
    }
}
