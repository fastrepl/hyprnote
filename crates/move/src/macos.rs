use accessibility_sys::{
    AXUIElementCopyAttributeValue, AXUIElementCreateApplication, AXUIElementRef,
    AXUIElementSetAttributeValue, AXValueCreate, kAXErrorSuccess, kAXFocusedWindowAttribute,
    kAXMainWindowAttribute, kAXPositionAttribute, kAXSizeAttribute, kAXTitleAttribute,
    kAXValueTypeCGPoint, kAXValueTypeCGSize, kAXWindowsAttribute,
};
use core_foundation::{
    array::CFArrayGetCount,
    array::CFArrayGetValueAtIndex,
    array::CFArrayRef,
    base::{CFRelease, CFRetain, CFType, TCFType},
    string::CFString,
};
use objc2_app_kit::{NSScreen, NSWorkspace};
use objc2_core_foundation::{CGPoint, CGSize};
use std::ptr::null_mut;

use crate::{Error, MoveResult, PermissionStatus, WindowInfo, WindowPosition};

pub fn is_available() -> bool {
    true
}

pub fn check_permissions() -> PermissionStatus {
    if macos_accessibility_client::accessibility::application_is_trusted() {
        PermissionStatus::Granted
    } else {
        PermissionStatus::Denied
    }
}

pub fn request_permissions() {
    macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
}

pub fn move_focused_window(position: WindowPosition) -> Result<MoveResult, Error> {
    if check_permissions() != PermissionStatus::Granted {
        return Err(Error::AccessibilityPermissionDenied);
    }

    let pid = get_frontmost_app_pid().ok_or(Error::NoFrontmostApp)?;

    let bundle_id = get_frontmost_app_bundle_id();
    if bundle_id.as_deref() == Some("com.hyprnote.app") {
        return Err(Error::CannotMoveOwnWindow);
    }

    let app_element = create_app_element(pid);
    if app_element.is_null() {
        return Err(Error::FailedToCreateAppElement);
    }

    let window = match get_focused_window(app_element) {
        Ok(w) => w,
        Err(e) => {
            unsafe { CFRelease(app_element as *const _) };
            return Err(e);
        }
    };

    let window_title = get_window_title(window);
    let app_name = get_frontmost_app_name();

    let (screen_x, screen_y, screen_width, screen_height) = match get_primary_screen_bounds() {
        Ok(bounds) => bounds,
        Err(e) => {
            unsafe {
                CFRelease(app_element as *const _);
                CFRelease(window as *const _);
            }
            return Err(e);
        }
    };

    let (x, y, width, height) = match position {
        WindowPosition::LeftHalf => (screen_x, screen_y, screen_width / 2.0, screen_height),
        WindowPosition::RightHalf => (
            screen_x + screen_width / 2.0,
            screen_y,
            screen_width / 2.0,
            screen_height,
        ),
        WindowPosition::LeftThird => (screen_x, screen_y, screen_width / 3.0, screen_height),
        WindowPosition::RightTwoThirds => (
            screen_x + screen_width / 3.0,
            screen_y,
            screen_width * 2.0 / 3.0,
            screen_height,
        ),
        WindowPosition::Custom {
            x,
            y,
            width,
            height,
        } => (x, y, width, height),
    };

    let size_result = set_window_size(window, width, height);
    let position_result = set_window_position(window, x, y);

    unsafe {
        CFRelease(app_element as *const _);
        CFRelease(window as *const _);
    }

    size_result?;
    position_result?;

    Ok(MoveResult {
        success: true,
        app_name,
        window_title,
    })
}

pub fn get_focused_window_info() -> Result<Option<WindowInfo>, Error> {
    if check_permissions() != PermissionStatus::Granted {
        return Err(Error::AccessibilityPermissionDenied);
    }

    let pid = match get_frontmost_app_pid() {
        Some(p) => p,
        None => return Ok(None),
    };

    let bundle_id = get_frontmost_app_bundle_id();
    if bundle_id.as_deref() == Some("com.hyprnote.app") {
        return Ok(None);
    }

    let app_element = create_app_element(pid);
    if app_element.is_null() {
        return Ok(None);
    }

    let window = match get_focused_window(app_element) {
        Ok(w) => w,
        Err(_) => {
            unsafe { CFRelease(app_element as *const _) };
            return Ok(None);
        }
    };

    let window_title = get_window_title(window);
    let app_name = get_frontmost_app_name();

    unsafe {
        CFRelease(app_element as *const _);
        CFRelease(window as *const _);
    }

    Ok(Some(WindowInfo {
        app_name,
        window_title,
        bundle_id,
    }))
}

fn get_frontmost_app_pid() -> Option<i32> {
    unsafe {
        let workspace = NSWorkspace::sharedWorkspace();
        let frontmost_app = workspace.frontmostApplication()?;
        Some(frontmost_app.processIdentifier())
    }
}

fn get_frontmost_app_bundle_id() -> Option<String> {
    unsafe {
        let workspace = NSWorkspace::sharedWorkspace();
        let frontmost_app = workspace.frontmostApplication()?;
        frontmost_app.bundleIdentifier().map(|s| s.to_string())
    }
}

fn get_frontmost_app_name() -> Option<String> {
    unsafe {
        let workspace = NSWorkspace::sharedWorkspace();
        let frontmost_app = workspace.frontmostApplication()?;
        frontmost_app.localizedName().map(|s| s.to_string())
    }
}

fn create_app_element(pid: i32) -> AXUIElementRef {
    unsafe { AXUIElementCreateApplication(pid) }
}

fn get_focused_window(app_element: AXUIElementRef) -> Result<AXUIElementRef, Error> {
    let mut window_ref: *mut CFType = null_mut();

    let attr = CFString::from_static_string(kAXFocusedWindowAttribute);
    let result = unsafe {
        AXUIElementCopyAttributeValue(
            app_element,
            attr.as_concrete_TypeRef(),
            &mut window_ref as *mut _ as *mut _,
        )
    };

    if result == kAXErrorSuccess && !window_ref.is_null() {
        return Ok(window_ref as AXUIElementRef);
    }

    let attr = CFString::from_static_string(kAXMainWindowAttribute);
    let result = unsafe {
        AXUIElementCopyAttributeValue(
            app_element,
            attr.as_concrete_TypeRef(),
            &mut window_ref as *mut _ as *mut _,
        )
    };

    if result == kAXErrorSuccess && !window_ref.is_null() {
        return Ok(window_ref as AXUIElementRef);
    }

    let attr = CFString::from_static_string(kAXWindowsAttribute);
    let mut windows_ref: *mut CFType = null_mut();
    let result = unsafe {
        AXUIElementCopyAttributeValue(
            app_element,
            attr.as_concrete_TypeRef(),
            &mut windows_ref as *mut _ as *mut _,
        )
    };

    if result == kAXErrorSuccess && !windows_ref.is_null() {
        let windows = windows_ref as CFArrayRef;
        unsafe {
            if CFArrayGetCount(windows) > 0 {
                let first_window = CFArrayGetValueAtIndex(windows, 0);
                // CFArrayGetValueAtIndex returns a non-retained pointer ("get rule").
                // We must retain it before releasing the array, otherwise the pointer
                // becomes invalid when the array releases its elements.
                CFRetain(first_window);
                CFRelease(windows_ref as *const _);
                return Ok(first_window as AXUIElementRef);
            }
            CFRelease(windows_ref as *const _);
        }
    }

    Err(Error::NoWindowFound)
}

fn get_window_title(window: AXUIElementRef) -> Option<String> {
    let mut title_ref: *mut CFType = null_mut();
    let attr = CFString::from_static_string(kAXTitleAttribute);

    let result = unsafe {
        AXUIElementCopyAttributeValue(
            window,
            attr.as_concrete_TypeRef(),
            &mut title_ref as *mut _ as *mut _,
        )
    };

    if result == kAXErrorSuccess && !title_ref.is_null() {
        // AXUIElementCopyAttributeValue returns an owned reference (+1),
        // so we use wrap_under_create_rule to transfer ownership to Rust.
        // The CFString will be released when it goes out of scope.
        let title = unsafe { CFString::wrap_under_create_rule(title_ref as _) };
        Some(title.to_string())
    } else {
        None
    }
}

fn get_primary_screen_bounds() -> Result<(f64, f64, f64, f64), Error> {
    unsafe {
        let screens = NSScreen::screens();
        let main_screen = screens.firstObject().ok_or(Error::NoScreenFound)?;
        let frame = main_screen.visibleFrame();
        Ok((
            frame.origin.x,
            frame.origin.y,
            frame.size.width,
            frame.size.height,
        ))
    }
}

fn set_window_position(window: AXUIElementRef, x: f64, y: f64) -> Result<(), Error> {
    let point = CGPoint::new(x, y);

    let position_value = unsafe {
        AXValueCreate(
            kAXValueTypeCGPoint,
            &point as *const _ as *const std::ffi::c_void,
        )
    };

    if position_value.is_null() {
        return Err(Error::FailedToCreateValue);
    }

    let attr = CFString::from_static_string(kAXPositionAttribute);
    let result = unsafe {
        AXUIElementSetAttributeValue(
            window,
            attr.as_concrete_TypeRef(),
            position_value as *const _,
        )
    };

    unsafe { CFRelease(position_value as *const _) };

    if result != kAXErrorSuccess {
        return Err(Error::FailedToSetPosition(result));
    }

    Ok(())
}

fn set_window_size(window: AXUIElementRef, width: f64, height: f64) -> Result<(), Error> {
    let size = CGSize::new(width, height);

    let size_value = unsafe {
        AXValueCreate(
            kAXValueTypeCGSize,
            &size as *const _ as *const std::ffi::c_void,
        )
    };

    if size_value.is_null() {
        return Err(Error::FailedToCreateValue);
    }

    let attr = CFString::from_static_string(kAXSizeAttribute);
    let result = unsafe {
        AXUIElementSetAttributeValue(window, attr.as_concrete_TypeRef(), size_value as *const _)
    };

    unsafe { CFRelease(size_value as *const _) };

    if result != kAXErrorSuccess {
        return Err(Error::FailedToSetSize(result));
    }

    Ok(())
}
