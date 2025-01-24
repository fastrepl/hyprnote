#[cfg(feature = "cloud")]
pub mod cloud;

#[cfg(feature = "local")]
pub mod local;

#[cfg(feature = "cloud")]
impl From<crate::cloud::get_job::DiarizationSegment> for hypr_stt::SpeakerSegment {
    fn from(segment: crate::cloud::get_job::DiarizationSegment) -> hypr_stt::SpeakerSegment {
        hypr_stt::SpeakerSegment {
            label: segment.speaker,
            start: segment.start,
            end: segment.end,
            confidence: None,
        }
    }
}
