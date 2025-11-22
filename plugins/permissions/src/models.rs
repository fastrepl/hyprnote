#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum PermissionStatus {
    NeverRequested,
    Denied,
    Authorized,
}

#[cfg(target_os = "macos")]
use objc2_av_foundation::AVAuthorizationStatus;

#[cfg(target_os = "macos")]
impl From<isize> for PermissionStatus {
    fn from(status: isize) -> Self {
        match status {
            hypr_tcc::GRANTED => Self::Authorized,
            hypr_tcc::NEVER_ASKED => Self::NeverRequested,
            _ => Self::Denied,
        }
    }
}

#[cfg(target_os = "macos")]
impl From<AVAuthorizationStatus> for PermissionStatus {
    fn from(status: AVAuthorizationStatus) -> Self {
        match status {
            AVAuthorizationStatus::NotDetermined => Self::NeverRequested,
            AVAuthorizationStatus::Authorized => Self::Authorized,
            _ => Self::Denied,
        }
    }
}
