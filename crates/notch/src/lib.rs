#[cfg(target_os = "macos")]
use swift_rs::{swift, SRString};

#[cfg(target_os = "macos")]
swift!(fn notch_show_info(title: SRString, description: SRString, icon_name: SRString));

#[cfg(target_os = "macos")]
swift!(fn notch_hide());

#[cfg(target_os = "macos")]
swift!(fn notch_compact());

#[cfg(target_os = "macos")]
pub fn show_notch(title: &str, description: &str, icon_name: &str) {
    unsafe {
        notch_show_info(
            SRString::from(title),
            SRString::from(description),
            SRString::from(icon_name),
        );
    }
}

#[cfg(not(target_os = "macos"))]
pub fn show_notch(_title: &str, _description: &str, _icon_name: &str) {}

#[cfg(target_os = "macos")]
pub fn hide_notch() {
    unsafe {
        notch_hide();
    }
}

#[cfg(not(target_os = "macos"))]
pub fn hide_notch() {}

#[cfg(target_os = "macos")]
pub fn compact_notch() {
    unsafe {
        notch_compact();
    }
}

#[cfg(not(target_os = "macos"))]
pub fn compact_notch() {}

#[cfg(all(test, target_os = "macos"))]
mod tests {}
