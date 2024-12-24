use anyhow::Result;

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
// TODO: rename to SpeakerReadInterface or something?

// TODO: can we renamed to readable device or something.
// pub trait SpeakerInputTrait {
//     fn new() -> Result<Self>
//     where
//         Self: Sized;
// }

// I think we can make it to implement some low level read function,
// and make `pub fn stream(&self) -> SpeakerStream {` to be generated from it.

// https://github.com/floneum/floneum/blob/92129ec99aac446348f42bc6db326a6d1c2d99ae/interfaces/kalosm-sound/src/source/mic.rs#L140
pub struct SpeakerStream {
    #[cfg(target_os = "macos")]
    inner: macos::SpeakerStream,
    #[cfg(target_os = "windows")]
    inner: windows::SpeakerStream,
}

#[cfg(test)]
mod tests {
    #[cfg(target_os = "macos")]
    #[test]
    fn test_macos() {
        assert!(true);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows() {
        assert!(true);
    }
}
