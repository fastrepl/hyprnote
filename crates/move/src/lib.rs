mod error;
mod types;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
mod linux;

pub use error::Error;
pub use types::{MoveResult, PermissionStatus, WindowInfo, WindowPosition};

#[cfg(target_os = "macos")]
pub use macos::{
    check_permissions, get_focused_window_info, is_available, move_focused_window,
    request_permissions,
};

#[cfg(target_os = "windows")]
pub use windows::{
    check_permissions, get_focused_window_info, is_available, move_focused_window,
    request_permissions,
};

#[cfg(target_os = "linux")]
pub use linux::{
    check_permissions, get_focused_window_info, is_available, move_focused_window,
    request_permissions,
};
