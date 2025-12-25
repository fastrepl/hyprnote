use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error(
        "Accessibility permission is denied. Please grant permission in System Preferences > Security & Privacy > Privacy > Accessibility"
    )]
    AccessibilityPermissionDenied,

    #[error("No frontmost application found")]
    NoFrontmostApp,

    #[error("Cannot move hyprnote's own window")]
    CannotMoveOwnWindow,

    #[error("Failed to create AXUIElement for application")]
    FailedToCreateAppElement,

    #[error("No window found for application")]
    NoWindowFound,

    #[error("Failed to create AXValue")]
    FailedToCreateValue,

    #[error("Failed to set window position (AXError: {0})")]
    FailedToSetPosition(i32),

    #[error("Failed to set window size (AXError: {0})")]
    FailedToSetSize(i32),

    #[error("No screen found")]
    NoScreenFound,

    #[error("Not supported on Linux")]
    NotSupportedOnLinux,

    #[error("Not supported on Windows")]
    NotSupportedOnWindows,

    #[error("Feature not available on this platform")]
    NotAvailable,
}
