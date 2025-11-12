// CalDAV client for Linux and other non-macOS platforms
#[cfg(not(target_os = "macos"))]
pub mod caldav;

#[cfg(not(target_os = "macos"))]
pub use caldav::CalDavHandle as Handle;

// Native macOS EventKit implementation
#[cfg(target_os = "macos")]
mod macos_native;

#[cfg(target_os = "macos")]
pub use macos_native::Handle;

// Re-export common types from the interface
pub use hypr_calendar_interface::{
    Calendar, CalendarSource, Error, Event, EventFilter, Participant, Platform,
};
