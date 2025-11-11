use audio::AudioInput;

/// Runs a simple binary test that creates an `AudioInput` from the default speaker, obtains its stream, and prints which `AudioStream` variant was returned.
///
/// This program exercises creation of a speaker `AudioInput`, requests its stream, and reports whether the stream is a `RealtimeSpeaker` variant. It does not poll or consume audio samples.
///
/// # Examples
///
/// ```
/// // Call the test binary's main to perform the creation and type check.
/// // The example demonstrates the intended usage; output is printed to stdout.
/// fn run() {
///     crate::main();
/// }
/// run();
/// ```
fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing SpeakerInput creation...");

    let mut audio_input = AudioInput::from_speaker(None)?;
    println!("SpeakerInput created successfully!");

    // Try to create a stream
    let stream = audio_input.stream()?;
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
    Ok(())
}
