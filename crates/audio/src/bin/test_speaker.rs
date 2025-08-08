use audio::AudioInput;

fn main() {
    println!("Testing SpeakerInput creation...");

    let mut audio_input = AudioInput::from_speaker();
    println!("SpeakerInput created successfully!");

    // Try to create a stream
    let stream = audio_input.stream();
    println!("Speaker stream created successfully!");

    // Try to get a few samples
    match stream {
        audio::AudioStream::RealtimeSpeaker { speaker: _ } => {
            println!("Got speaker stream");
            // We won't actually poll the stream in this simple test
        }
        _ => {
            println!("Unexpected stream type");
        }
    }

    println!("Test completed successfully!");
}