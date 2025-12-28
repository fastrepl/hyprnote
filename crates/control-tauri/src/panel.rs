use tauri::{AppHandle, Emitter, Listener, Manager, WebviewWindow};
use tauri_nspanel::{ManagerExt, Panel, WebviewWindowExt, panel};

#[cfg(target_os = "macos")]
use objc2::msg_send;
#[cfg(target_os = "macos")]
use objc2::runtime::AnyObject;
#[cfg(target_os = "macos")]
use objc2_app_kit::NSWindowCollectionBehavior;
#[cfg(target_os = "macos")]
use objc2_foundation::NSPoint;

#[cfg(target_os = "macos")]
const NS_MAIN_MENU_WINDOW_LEVEL: i64 = 24;
#[cfg(target_os = "macos")]
const NS_WINDOW_STYLE_MASK_NON_ACTIVATING_PANEL: i64 = 1 << 7;

panel!(MenubarPanel {
    config: {
        can_become_key_window: true,
        is_floating_panel: true
    }
});

pub fn swizzle_to_menubar_panel(app_handle: &AppHandle) {
    let window = app_handle.get_webview_window("main").unwrap();

    let panel = window.to_panel::<MenubarPanel>().unwrap();

    #[cfg(target_os = "macos")]
    {
        panel.set_level(NS_MAIN_MENU_WINDOW_LEVEL + 1);

        panel.set_collection_behavior(
            NSWindowCollectionBehavior::CanJoinAllSpaces
                | NSWindowCollectionBehavior::Stationary
                | NSWindowCollectionBehavior::FullScreenAuxiliary,
        );
    }
}

pub fn setup_menubar_panel_listeners(app_handle: &AppHandle) {
    fn hide_menubar_panel(app_handle: &AppHandle) {
        if check_menubar_frontmost() {
            return;
        }

        if let Ok(panel) = app_handle.get_webview_panel("main") {
            panel.hide();
        }
    }

    let handle = app_handle.clone();

    app_handle.listen_any("menubar_panel_did_resign_key", move |_| {
        hide_menubar_panel(&handle);
    });

    let handle = app_handle.clone();

    let callback = Box::new(move || {
        hide_menubar_panel(&handle);
    });

    #[cfg(target_os = "macos")]
    {
        register_workspace_listener(
            "NSWorkspaceDidActivateApplicationNotification".into(),
            callback.clone(),
        );

        register_workspace_listener(
            "NSWorkspaceActiveSpaceDidChangeNotification".into(),
            callback,
        );
    }
}

pub fn update_menubar_appearance(app_handle: &AppHandle) {
    let window = app_handle.get_webview_window("main").unwrap();
    set_corner_radius(&window, 13.0);
}

#[cfg(target_os = "macos")]
pub fn set_corner_radius(window: &WebviewWindow, radius: f64) {
    use tauri::WebviewWindowExt as TauriWebviewWindowExt;

    let ns_window = window.ns_window().unwrap();

    unsafe {
        let ns_window = ns_window as *mut AnyObject;
        let content_view: *mut AnyObject = msg_send![ns_window, contentView];
        let _: () = msg_send![content_view, setWantsLayer: true];
        let layer: *mut AnyObject = msg_send![content_view, layer];
        let _: () = msg_send![layer, setCornerRadius: radius];
    }
}

#[cfg(not(target_os = "macos"))]
pub fn set_corner_radius(_window: &WebviewWindow, _radius: f64) {
    // No-op on non-macOS platforms
}

pub fn position_menubar_panel(app_handle: &AppHandle, padding_top: f64) {
    let window = app_handle.get_webview_window("main").unwrap();

    let monitor = monitor::get_monitor_with_cursor().unwrap();

    let scale_factor = monitor.scale_factor();

    let visible_area = monitor.visible_area();

    let monitor_pos = visible_area.position().to_logical::<f64>(scale_factor);

    let monitor_size = visible_area.size().to_logical::<f64>(scale_factor);

    #[cfg(target_os = "macos")]
    {
        use tauri::WebviewWindowExt as TauriWebviewWindowExt;

        let mouse_location: NSPoint =
            unsafe { msg_send![objc2_app_kit::NSEvent::class(), mouseLocation] };

        let ns_window = window.ns_window().unwrap();
        let ns_window = ns_window as *mut AnyObject;

        unsafe {
            let win_frame: objc2_foundation::NSRect = msg_send![ns_window, frame];

            let mut new_origin_y = (monitor_pos.y + monitor_size.height) - win_frame.size.height;
            new_origin_y -= padding_top;

            let new_origin_x = {
                let top_right = mouse_location.x + (win_frame.size.width / 2.0);
                let is_offscreen = top_right > monitor_pos.x + monitor_size.width;

                if !is_offscreen {
                    mouse_location.x - (win_frame.size.width / 2.0)
                } else {
                    let diff = top_right - (monitor_pos.x + monitor_size.width);
                    mouse_location.x - (win_frame.size.width / 2.0) - diff
                }
            };

            let new_frame = objc2_foundation::NSRect {
                origin: NSPoint {
                    x: new_origin_x,
                    y: new_origin_y,
                },
                size: win_frame.size,
            };

            let _: () = msg_send![ns_window, setFrame: new_frame display: false];
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, monitor_pos, monitor_size, padding_top);
    }
}

#[cfg(target_os = "macos")]
fn register_workspace_listener(name: String, callback: Box<dyn Fn() + Send + Sync>) {
    use std::ffi::CString;

    unsafe {
        let workspace: *mut AnyObject =
            msg_send![objc2_app_kit::NSWorkspace::class(), sharedWorkspace];
        let notification_center: *mut AnyObject = msg_send![workspace, notificationCenter];

        let block = objc2::rc::Retained::into_raw(objc2::rc::Retained::new(
            objc2::runtime::AnyObject::class(),
        ));

        let name_cstr = CString::new(name).unwrap();
        let ns_name: *mut AnyObject = msg_send![objc2_foundation::NSString::class(), stringWithUTF8String: name_cstr.as_ptr()];

        // Note: This is a simplified version. In production, you'd want to use block2 crate
        // for proper block handling. For now, we'll rely on the panel delegate for resign key events.
        let _ = (notification_center, block, ns_name, callback);
    }
}

#[cfg(not(target_os = "macos"))]
fn register_workspace_listener(_name: String, _callback: Box<dyn Fn() + Send + Sync>) {
    // No-op on non-macOS platforms
}

#[cfg(target_os = "macos")]
fn app_pid() -> i32 {
    unsafe {
        let process_info: *mut AnyObject =
            msg_send![objc2_foundation::NSProcessInfo::class(), processInfo];
        let pid: i32 = msg_send![process_info, processIdentifier];
        pid
    }
}

#[cfg(target_os = "macos")]
fn get_frontmost_app_pid() -> i32 {
    unsafe {
        let workspace: *mut AnyObject =
            msg_send![objc2_app_kit::NSWorkspace::class(), sharedWorkspace];
        let frontmost_application: *mut AnyObject = msg_send![workspace, frontmostApplication];
        let pid: i32 = msg_send![frontmost_application, processIdentifier];
        pid
    }
}

#[cfg(target_os = "macos")]
pub fn check_menubar_frontmost() -> bool {
    get_frontmost_app_pid() == app_pid()
}

#[cfg(not(target_os = "macos"))]
pub fn check_menubar_frontmost() -> bool {
    false
}
