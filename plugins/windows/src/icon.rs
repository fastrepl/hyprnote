use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "snake_case")]
pub enum AppIcon {
    #[default]
    Dark,
    Light,
    Nightly,
    Pro,
}

impl AppIcon {
    pub fn all() -> Vec<AppIcon> {
        vec![
            AppIcon::Dark,
            AppIcon::Light,
            AppIcon::Nightly,
            AppIcon::Pro,
        ]
    }
}

#[cfg(target_os = "macos")]
pub fn set_app_icon(icon: AppIcon) -> Result<(), String> {
    use objc2::rc::Retained;
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::{MainThreadMarker, NSData};

    let icon_bytes: &[u8] = match icon {
        AppIcon::Dark => include_bytes!("../../../apps/desktop/src-tauri/icons/dynamic/dark.png"),
        AppIcon::Light => include_bytes!("../../../apps/desktop/src-tauri/icons/dynamic/light.png"),
        AppIcon::Nightly => {
            include_bytes!("../../../apps/desktop/src-tauri/icons/dynamic/nightly.png")
        }
        AppIcon::Pro => include_bytes!("../../../apps/desktop/src-tauri/icons/dynamic/pro.png"),
    };

    let mtm = MainThreadMarker::new().ok_or("Must be called from main thread")?;

    unsafe {
        let data = NSData::with_bytes(icon_bytes);
        let image: Option<Retained<NSImage>> = NSImage::initWithData(NSImage::alloc(), &data);

        if let Some(image) = image {
            let app = NSApplication::sharedApplication(mtm);
            app.setApplicationIconImage(Some(&image));
            Ok(())
        } else {
            Err("Failed to create NSImage from icon data".to_string())
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub fn set_app_icon(_icon: AppIcon) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn reset_app_icon() -> Result<(), String> {
    use objc2_app_kit::NSApplication;
    use objc2_foundation::MainThreadMarker;

    let mtm = MainThreadMarker::new().ok_or("Must be called from main thread")?;

    unsafe {
        let app = NSApplication::sharedApplication(mtm);
        app.setApplicationIconImage(None);
    }

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn reset_app_icon() -> Result<(), String> {
    Ok(())
}
