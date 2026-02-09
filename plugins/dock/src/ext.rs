#[cfg(target_os = "macos")]
static APP_HANDLE: std::sync::OnceLock<tauri::AppHandle> = std::sync::OnceLock::new();

#[cfg(target_os = "macos")]
pub fn setup_dock_menu(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use objc2::runtime::{AnyClass, AnyObject};
    use objc2::{msg_send, sel};
    use objc2_app_kit::NSApplication;
    use objc2_foundation::MainThreadMarker;

    APP_HANDLE.get_or_init(|| app.clone());

    app.run_on_main_thread(move || {
        let mtm = MainThreadMarker::new().expect("run_on_main_thread guarantees main thread");
        let ns_app = NSApplication::sharedApplication(mtm);

        unsafe {
            let delegate: *mut AnyObject = msg_send![&*ns_app, delegate];
            if delegate.is_null() {
                return;
            }

            let delegate_class: *mut AnyClass = msg_send![delegate, class];
            if delegate_class.is_null() {
                return;
            }

            let sel = sel!(applicationDockMenu:);

            extern "C" fn dock_menu_handler(
                _this: *mut objc2::runtime::AnyObject,
                _sel: objc2::runtime::Sel,
                _sender: *mut objc2::runtime::AnyObject,
            ) -> *mut objc2::runtime::AnyObject {
                use objc2::MainThreadOnly;
                use objc2_app_kit::{NSMenu, NSMenuItem};
                use objc2_foundation::{MainThreadMarker, NSString};

                let mtm = unsafe { MainThreadMarker::new_unchecked() };

                let ns_app = objc2_app_kit::NSApplication::sharedApplication(mtm);
                let windows = ns_app.windows();
                for i in 0..windows.len() {
                    let window: *mut objc2::runtime::AnyObject =
                        unsafe { objc2::msg_send![&*windows, objectAtIndex: i] };
                    if !window.is_null() {
                        let _: () =
                            unsafe { objc2::msg_send![window, setExcludedFromWindowsMenu: true] };
                    }
                }

                let menu = NSMenu::new(mtm);
                menu.setAutoenablesItems(false);

                let title = NSString::from_str("New Note");
                let key_equivalent = NSString::from_str("");
                let new_note_sel = objc2::sel!(handleNewNote:);
                let item = unsafe {
                    NSMenuItem::initWithTitle_action_keyEquivalent(
                        NSMenuItem::alloc(mtm),
                        &title,
                        Some(new_note_sel),
                        &key_equivalent,
                    )
                };
                item.setEnabled(true);
                menu.addItem(&item);

                objc2::rc::Retained::autorelease_return(menu) as *mut objc2::runtime::AnyObject
            }

            extern "C" fn handle_new_note(
                _this: *mut objc2::runtime::AnyObject,
                _sel: objc2::runtime::Sel,
                _sender: *mut objc2::runtime::AnyObject,
            ) {
                if let Some(app) = APP_HANDLE.get() {
                    use tauri_plugin_windows::{AppWindow, Navigate, WindowsPluginExt};
                    if app.windows().show(AppWindow::Main).is_ok() {
                        let _ = app.windows().emit_navigate(
                            AppWindow::Main,
                            Navigate {
                                path: "/app/new".to_string(),
                                search: None,
                            },
                        );
                    }
                }
            }

            let dock_imp: objc2::runtime::Imp = std::mem::transmute(dock_menu_handler as *const ());
            let dock_types = c"@@:@";

            let added =
                objc2::ffi::class_addMethod(delegate_class, sel, dock_imp, dock_types.as_ptr());
            if !added.as_bool() {
                objc2::ffi::class_replaceMethod(delegate_class, sel, dock_imp, dock_types.as_ptr());
            }

            let action_sel = sel!(handleNewNote:);
            let action_imp: objc2::runtime::Imp = std::mem::transmute(handle_new_note as *const ());
            let action_types = c"v@:@";

            let added = objc2::ffi::class_addMethod(
                delegate_class,
                action_sel,
                action_imp,
                action_types.as_ptr(),
            );
            if !added.as_bool() {
                objc2::ffi::class_replaceMethod(
                    delegate_class,
                    action_sel,
                    action_imp,
                    action_types.as_ptr(),
                );
            }
        }
    })?;

    Ok(())
}
