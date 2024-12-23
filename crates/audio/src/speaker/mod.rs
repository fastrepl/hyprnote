#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

// https://github.com/floneum/floneum/blob/92129ec99aac446348f42bc6db326a6d1c2d99ae/interfaces/kalosm-sound/src/source/mic.rs#L41
pub struct SpeakerInput {
    #[cfg(target_os = "macos")]
    inner: macos::SpeakerInput,
    #[cfg(target_os = "windows")]
    inner: windows::SpeakerInput,
}

// https://github.com/floneum/floneum/blob/92129ec99aac446348f42bc6db326a6d1c2d99ae/interfaces/kalosm-sound/src/source/mic.rs#L140
pub struct SpeakerStream {
    #[cfg(target_os = "macos")]
    inner: macos::SpeakerStream,
    #[cfg(target_os = "windows")]
    inner: windows::SpeakerStream,
}
