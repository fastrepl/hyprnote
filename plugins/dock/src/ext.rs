#[cfg(target_os = "macos")]
pub fn setup_dock_menu(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use objc2::rc::Retained;
    use objc2::runtime::{AnyClass, AnyObject, Sel};
    use objc2::{msg_send, sel};
    use objc2_app_kit::{NSApplication, NSMenu, NSMenuItem};
    use objc2_foundation::{MainThreadMarker, NSString};
    use std::sync::OnceLock;

    static DOCK_MENU: OnceLock<Retained<NSMenu>> = OnceLock::new();

    app.run_on_main_thread(move || {
        let mtm = MainThreadMarker::new().expect("run_on_main_thread guarantees main thread");
        let ns_app = NSApplication::sharedApplication(mtm);

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

        DOCK_MENU.get_or_init(|| menu);

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
                _this: &AnyObject,
                _sel: Sel,
                _sender: *mut AnyObject,
            ) -> *mut AnyObject {
                DOCK_MENU
                    .get()
                    .map(|menu| Retained::as_ptr(menu) as *mut AnyObject)
                    .unwrap_or(std::ptr::null_mut())
            }

            let success = objc2::runtime::AnyClass::add_method(
                delegate_class as *mut AnyClass,
                sel,
                dock_menu_handler
                    as unsafe extern "C" fn(&AnyObject, Sel, *mut AnyObject) -> *mut AnyObject,
            );

            if !success {
                objc2::runtime::AnyClass::replace_method(
                    delegate_class as *mut AnyClass,
                    sel,
                    dock_menu_handler
                        as unsafe extern "C" fn(&AnyObject, Sel, *mut AnyObject) -> *mut AnyObject,
                );
            }
        }
    })?;

    Ok(())
}
