# Linux Audio Implementation Status

This document outlines the current status of the audio implementation for Linux in this project.

## Current Implementation

The current implementation in `crates/audio/src/speaker/linux.rs` is a **mock implementation**. It does not capture any actual audio from the system. Instead, it generates a stream of silence.

## Microphone Usage Detection

The application uses the `pactl` command-line tool to detect if a microphone is currently in use by any application. This is implemented in `crates/detect/src/mic/linux.rs`.

This indicates that there is some level of interaction with the PulseAudio sound server, but it is limited to monitoring and does not include audio capture.

## Audio Processing Pipeline

The application has a sophisticated audio processing pipeline that is managed by a state machine in `plugins/listener/src/fsm.rs`. The pipeline is as follows:

1.  **Audio Input:**
    *   Microphone audio is captured using the `cpal` crate, which provides a cross-platform API for audio I/O.
    *   Speaker audio is captured using a platform-specific implementation. **On Linux, this is currently a mock implementation that generates silence.**

2.  **Processing:**
    *   Both the microphone and speaker audio streams are resampled to 16kHz.
    *   Acoustic Echo Cancellation (AEC) is performed using the `hypr_aec` crate. The speaker audio is used as the reference signal to remove echo from the microphone audio.
    *   The AEC-processed microphone audio and the speaker audio are mixed together.
    *   Audio levels (amplitude) are calculated and sent to the frontend for visualization.

3.  **Output:**
    *   The mixed audio is sent to the `owhisper` service for speech-to-text transcription.
    *   In debug mode, the raw microphone, raw speaker, and mixed audio streams are saved to `.wav` files for debugging purposes.

## Missing Features

The following features are missing for a complete Linux audio implementation:

*   **Actual audio capture:** The primary missing feature is the ability to capture system audio. The current implementation only provides a silent stream.
*   **PipeWire support:** There is no integration with the PipeWire audio server. A full implementation would require using the PipeWire API to capture audio.
*   **PulseAudio support:** There is no integration with the PulseAudio audio server. A full implementation would require using the PulseAudio API to capture audio.
*   **ALSA support:** While ALSA is mentioned in the code comments, there is no actual implementation that uses ALSA to capture audio.

## Next Steps

To have a functional audio implementation on Linux, the following steps need to be taken:

1.  Decide on the primary audio backend to support. PipeWire is the modern choice, but PulseAudio and ALSA are still relevant for compatibility.
2.  Implement audio capture using the chosen audio backend's API.
3.  Provide a mechanism to select the audio backend at runtime or compile time.
