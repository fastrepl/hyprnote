use futures_channel::mpsc::{unbounded, UnboundedReceiver, UnboundedSender};
use futures_util::{Stream, StreamExt};
use std::pin::Pin;
use std::task::{Context, Poll};
use std::thread;
use std::time::Duration;

#[cfg(feature = "pulseaudio")]
use libpulse_binding as pulse;
#[cfg(feature = "pulseaudio")]
use libpulse_simple_binding as pulse_simple;

pub struct SpeakerInput {
    audio_backend: AudioBackend,
}

#[derive(Debug)]
pub(crate) enum AudioBackend {
    #[cfg(feature = "pulseaudio")]
    PulseAudio {
        monitor_source: String,
    },
    #[allow(dead_code)]
    Alsa {
        device: String,
    },
    Mock,
}

impl SpeakerInput {
    /// Construct a new Linux SpeakerInput handle.
    pub fn new() -> Result<Self, crate::Error> {
        tracing::debug!("Creating Linux SpeakerInput");

        let audio_backend = Self::detect_audio_backend()?;
        tracing::info!("Using audio backend: {:?}", audio_backend);

        Ok(Self { audio_backend })
    }

    fn detect_audio_backend() -> Result<AudioBackend, crate::Error> {
        #[cfg(feature = "pulseaudio")]
        {
            // Try PulseAudio first
            if let Ok(monitor_source) = Self::find_pulseaudio_monitor_source() {
                tracing::info!("Found PulseAudio monitor source: {}", monitor_source);
                return Ok(AudioBackend::PulseAudio { monitor_source });
            }
        }

        // TODO: Try ALSA loopback device
        // For now, fall back to mock
        tracing::warn!("No supported audio backend found, using mock implementation");
        Ok(AudioBackend::Mock)
    }

    #[cfg(feature = "pulseaudio")]
    fn find_pulseaudio_monitor_source() -> Result<String, crate::Error> {
        use std::env;
        use std::process::Command;

        // Log current environment for debugging
        if let Ok(runtime_dir) = env::var("XDG_RUNTIME_DIR") {
            tracing::debug!("XDG_RUNTIME_DIR is set to: {}", runtime_dir);
        } else {
            tracing::warn!("XDG_RUNTIME_DIR is not set!");
        }
        if let Ok(dbus_addr) = env::var("DBUS_SESSION_BUS_ADDRESS") {
            tracing::debug!("DBUS_SESSION_BUS_ADDRESS is set to: {}", dbus_addr);
        } else {
            tracing::warn!("DBUS_SESSION_BUS_ADDRESS is not set!");
        }

        // Query PulseAudio for monitor sources
        // Note: Command::new() inherits environment by default, so we don't need to set env vars explicitly
        let mut cmd = Command::new("pactl");
        cmd.args(["list", "short", "sources"]);

        tracing::debug!("Executing: pactl list short sources");
        let output = cmd.output().map_err(|e| {
            crate::Error::AudioSystem(format!("Failed to query PulseAudio sources: {}", e))
        })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            tracing::error!("pactl command failed. stderr: {}", stderr);
            return Err(crate::Error::AudioSystem(format!(
                "PulseAudio not available or pactl command failed: {}",
                stderr
            )));
        }

        let stdout = String::from_utf8(output.stdout)
            .map_err(|e| crate::Error::AudioSystem(format!("Invalid pactl output: {}", e)))?;

        tracing::debug!("pactl output:\n{}", stdout);

        // Find the first monitor source (typically the default sink's monitor)
        for line in stdout.lines() {
            tracing::debug!("Checking line: {}", line);
            if line.contains(".monitor") {
                if let Some(source_name) = line.split_whitespace().nth(1) {
                    tracing::info!("Found monitor source: {}", source_name);
                    return Ok(source_name.to_string());
                }
            }
        }

        Err(crate::Error::AudioSystem(
            "No PulseAudio monitor source found".to_string(),
        ))
    }

    pub fn stream(self) -> SpeakerStream {
        tracing::debug!("Creating Linux SpeakerStream");
        SpeakerStream::new(self.audio_backend)
    }
}

pub struct SpeakerStream {
    receiver: UnboundedReceiver<f32>,
    _handle: thread::JoinHandle<()>, // Keep the thread alive
}

impl SpeakerStream {
    pub fn new(backend: AudioBackend) -> Self {
        tracing::debug!("Creating Linux SpeakerStream with backend: {:?}", backend);
        let (sender, receiver): (UnboundedSender<f32>, UnboundedReceiver<f32>) = unbounded();

        let handle = thread::spawn(move || {
            match backend {
                #[cfg(feature = "pulseaudio")]
                AudioBackend::PulseAudio { monitor_source } => {
                    if let Err(e) = Self::pulseaudio_capture_thread(sender, monitor_source) {
                        tracing::error!("PulseAudio capture thread failed: {}", e);
                    }
                }
                AudioBackend::Alsa { device: _ } => {
                    // TODO: Implement ALSA capture
                    tracing::warn!("ALSA capture not yet implemented, falling back to mock");
                    Self::mock_capture_thread(sender);
                }
                AudioBackend::Mock => {
                    Self::mock_capture_thread(sender);
                }
            }
        });

        Self {
            receiver,
            _handle: handle,
        }
    }

    #[cfg(feature = "pulseaudio")]
    fn pulseaudio_capture_thread(
        sender: UnboundedSender<f32>,
        monitor_source: String,
    ) -> Result<(), crate::Error> {
        use pulse::sample::{Format, Spec};
        use pulse::stream::Direction;
        use pulse_simple::Simple;

        tracing::info!(
            "Starting PulseAudio capture from monitor source: {}",
            monitor_source
        );

        let spec = Spec {
            format: Format::F32le,
            channels: 2,
            rate: 48000,
        };

        if !spec.is_valid() {
            return Err(crate::Error::AudioSystem(
                "Invalid PulseAudio spec".to_string(),
            ));
        }

        let simple = Simple::new(
            None,                  // Use default server
            "Hyprnote",            // Application name
            Direction::Record,     // Record (capture)
            Some(&monitor_source), // Use monitor source
            "Speaker Capture",     // Stream description
            &spec,                 // Sample format spec
            None,                  // Use default channel map
            None,                  // Use default buffering attributes
        )
        .map_err(|e| {
            crate::Error::AudioSystem(format!("Failed to create PulseAudio simple: {}", e))
        })?;

        let mut buffer = vec![0u8; 1024 * std::mem::size_of::<f32>()]; // Buffer for 1024 f32 samples

        loop {
            // Read audio data from PulseAudio
            if let Err(e) = simple.read(&mut buffer) {
                tracing::error!("PulseAudio read error: {}", e);
                break;
            }

            // Convert bytes to f32 samples and send to stream
            let samples = bytemuck::cast_slice::<u8, f32>(&buffer);

            // For stereo, we'll take the average of left and right channels
            for chunk in samples.chunks_exact(2) {
                let mono_sample = (chunk[0] + chunk[1]) / 2.0;
                if sender.unbounded_send(mono_sample).is_err() {
                    tracing::debug!("SpeakerStream channel closed, exiting PulseAudio thread");
                    return Ok(());
                }
            }
        }

        Ok(())
    }

    fn mock_capture_thread(sender: UnboundedSender<f32>) {
        tracing::debug!("Starting mock Linux SpeakerStream thread");
        loop {
            if sender.unbounded_send(0.0).is_err() {
                tracing::debug!("SpeakerStream channel closed, exiting mock thread");
                break;
            }
            thread::sleep(Duration::from_millis(10));
        }
    }

    pub fn sample_rate(&self) -> u32 {
        48000
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        // Use async-aware receiver to avoid busy-loop; waker is notified on send
        self.get_mut().receiver.poll_next_unpin(cx)
    }
}

impl Drop for SpeakerStream {
    fn drop(&mut self) {
        tracing::debug!("Dropping SpeakerStream");
    }
}
