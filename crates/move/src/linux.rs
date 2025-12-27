use crate::{Error, MoveResult, PermissionStatus, WindowInfo, WindowPosition};

pub fn is_available() -> bool {
    false
}

pub fn check_permissions() -> PermissionStatus {
    PermissionStatus::NotRequired
}

pub fn request_permissions() {}

pub fn move_focused_window(_position: WindowPosition) -> Result<MoveResult, Error> {
    Err(Error::NotSupportedOnLinux)
}

pub fn get_focused_window_info() -> Result<Option<WindowInfo>, Error> {
    Err(Error::NotSupportedOnLinux)
}
