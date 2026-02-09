#[cfg(target_os = "macos")]
pub fn setup_dock_menu(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use objc2::runtime::{AnyClass, AnyObject};
    use objc2::{msg_send, sel};
    use objc2_app_kit::NSApplication;
    use objc2_foundation::MainThreadMarker;

    app.run_on_main_thread(move || {
        let mtm = MainThreadMarker::new().expect("run_on_main_thread guarantees main thread");
        let ns_app = NSApplication::sharedApplication(mtm);

        unsafe {
            let delegate: *mut AnyObject = msg_send![&*ns_app, delegate];
            if delegate.is_null() {
                return;
            }

            let delegate_class: *const AnyClass = msg_send![delegate, class];
            if delegate_class.is_null() {
                return;
            }

            let sel = sel!(applicationDockMenu:);

            extern "C" fn dock_menu_handler(
                _this: *mut objc2::runtime::AnyObject,
                _sel: objc2::ffi::Sel,
                _sender: *mut objc2::runtime::AnyObject,
            ) -> *mut objc2::runtime::AnyObject {
                use objc2::MainThreadOnly;
                use objc2_app_kit::{NSMenu, NSMenuItem};
                use objc2_foundation::{MainThreadMarker, NSString};

                let mtm = unsafe { MainThreadMarker::new_unchecked() };
                let menu = NSMenu::new(mtm);

                let title = NSString::from_str("New Note");
                let key_equivalent = NSString::from_str("");
                let item = unsafe {
                    NSMenuItem::initWithTitle_action_keyEquivalent(
                        NSMenuItem::alloc(),
                        &title,
                        None,
                        &key_equivalent,
                    )
                };
                menu.addItem(&item);

                objc2::rc::Retained::into_raw(menu) as *mut objc2::runtime::AnyObject
            }

            let added = objc2::ffi::class_addMethod(
                delegate_class as *mut objc2::ffi::objc_class,
                sel.as_ptr(),
                Some(std::mem::transmute::<
                    extern "C" fn(
                        *mut AnyObject,
                        objc2::ffi::Sel,
                        *mut AnyObject,
                    ) -> *mut AnyObject,
                    unsafe extern "C" fn(),
                >(dock_menu_handler)),
                b"@:@\0".as_ptr() as *const _,
            );

            if !added {
                objc2::ffi::class_replaceMethod(
                    delegate_class as *mut objc2::ffi::objc_class,
                    sel.as_ptr(),
                    Some(std::mem::transmute::<
                        extern "C" fn(
                            *mut AnyObject,
                            objc2::ffi::Sel,
                            *mut AnyObject,
                        ) -> *mut AnyObject,
                        unsafe extern "C" fn(),
                    >(dock_menu_handler)),
                    b"@:@\0".as_ptr() as *const _,
                );
            }
        }
    })?;

    Ok(())
}
