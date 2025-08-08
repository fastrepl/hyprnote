use audio::AudioInput;

fn main() {
    println!("Testing microphone access...");

    // Enable logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .init();

    println!("Listing available microphone devices:");
    let devices = audio::AudioInput::list_mic_devices();
    for (i, device) in devices.iter().enumerate() {
        println!("  {}. {}", i, device);
    }

    println!("\nGetting default microphone device name:");
    let default_device = audio::AudioInput::get_default_mic_device_name();
    println!("  Default device: {}", default_device);

    println!("\nTrying to create microphone input with default device:");
    match AudioInput::from_mic(None) {
        Ok(_) => println!("  Success! Microphone input created."),
        Err(e) => println!("  Failed: {:?}", e),
    }

    println!("\nTrying to create microphone input with specific device name:");
    if !devices.is_empty() {
        let first_device = &devices[0];
        println!("  Trying device: {}", first_device);
        match AudioInput::from_mic(Some(first_device.clone())) {
            Ok(_) => println!("  Success! Microphone input created with specific device."),
            Err(e) => println!("  Failed: {:?}", e),
        }

        // Specifically test the echo-cancel-source device if it's available
        if devices.contains(&"echo-cancel-source".to_string()) {
            println!("\nSpecifically testing echo-cancel-source device:");
            match AudioInput::from_mic(Some("echo-cancel-source".to_string())) {
                Ok(_) => println!("  Success! echo-cancel-source device is working"),
                Err(e) => println!("  Failed: {:?}", e),
            }
        }
    } else {
        // Try some known working device names
        println!("  No devices available from enumeration, trying known device names:");
        let test_devices = vec![
            "echo-cancel-source".to_string(),
            "HD-Audio Generic".to_string(),
            "default".to_string(),
            "default:CARD=Generic_1".to_string(),
        ];

        for device_name in &test_devices {
            println!("    Trying device: {}", device_name);
            match AudioInput::from_mic(Some(device_name.clone())) {
                Ok(_) => {
                    println!("    Success! Microphone input created with device: {}", device_name);
                    break;
                },
                Err(e) => println!("    Failed: {:?}", e),
            }
        }

        // Specifically test the echo-cancel-source device
        println!("\nSpecifically testing echo-cancel-source device:");
        match AudioInput::from_mic(Some("echo-cancel-source".to_string())) {
            Ok(_) => println!("  Success! echo-cancel-source device is working"),
            Err(e) => println!("  Failed: {:?}", e),
        }
    }
}