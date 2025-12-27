/// Position specification for window placement
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
pub enum WindowPosition {
    LeftHalf,
    RightHalf,
    LeftThird,
    RightTwoThirds,
    Custom {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    },
}

/// Result of a window move operation
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
pub struct MoveResult {
    pub success: bool,
    pub app_name: Option<String>,
    pub window_title: Option<String>,
}

/// Information about a window
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
pub struct WindowInfo {
    pub app_name: Option<String>,
    pub window_title: Option<String>,
    pub bundle_id: Option<String>,
}

/// Permission status for window manipulation
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
pub enum PermissionStatus {
    Granted,
    Denied,
    NotRequired,
}
