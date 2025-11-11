use audio::AudioInput;
use futures_util::StreamExt;
use std::time::Duration;

/// Extended test that actually captures audio samples from the speaker
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    
    println!("🎧 Testing Linux speaker audio capture with actual sampling...");
    
    // Create speaker audio input
    let mut audio_input = AudioInput::from_speaker(None)?;
    println!("✅ SpeakerInput created successfully!");
    
    // Create stream
    let stream = audio_input.stream()?;
    println!("✅ Speaker stream created successfully!");
    
    // Test actual audio capture
    match stream {
        audio::AudioStream::RealtimeSpeaker { mut speaker } => {
            println!("🔊 Got RealtimeSpeaker stream, capturing samples...");
            
            let mut sample_count = 0;
            let mut max_amplitude = 0.0f32;
            let mut rms_sum = 0.0f32;
            
            // Capture audio for a few seconds
            let timeout = tokio::time::timeout(Duration::from_secs(3), async {
                while let Some(sample) = speaker.next().await {
                    sample_count += 1;
                    max_amplitude = max_amplitude.max(sample.abs());
                    rms_sum += sample * sample;
                    
                    // Print progress every 0.5 seconds at 48kHz
                    if sample_count % 24000 == 0 {
                        let rms = (rms_sum / sample_count as f32).sqrt();
                        println!("📊 Captured {} samples | Max: {:.4} | RMS: {:.4}", 
                                sample_count, max_amplitude, rms);
                    }
                    
                    if sample_count >= 144000 { // Stop after ~3 seconds at 48kHz
                        break;
                    }
                }
            }).await;
            
            let final_rms = (rms_sum / sample_count as f32).sqrt();
            
            match timeout {
                Ok(_) => {
                    println!("✅ Successfully captured {} audio samples", sample_count);
                    println!("📈 Final statistics:");
                    println!("   • Maximum amplitude: {:.6}", max_amplitude);
                    println!("   • RMS level: {:.6}", final_rms);
                    
                    if max_amplitude > 0.001 {
                        println!("🎉 Real audio detected! Speaker capture is working!");
                    } else if max_amplitude > 0.0 {
                        println!("🔇 Very low audio detected - this might be background noise or very quiet audio");
                    } else {
                        println!("🔇 Only silence detected. This is normal if no audio is currently playing.");
                        println!("   💡 Try playing some audio and running this test again.");
                    }
                },
                Err(_) => {
                    println!("⏰ Test timed out after 3 seconds");
                }
            }
        },
        _ => {
            println!("❌ Unexpected stream type");
        }
    }
    
    println!("🏁 Test completed!");
    Ok(())
}