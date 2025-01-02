// https://developer.apple.com/documentation/appkit/nsworkspace?language=objc
// https://developer.apple.com/documentation/foundation/nsdistributednotificationcenter/1414151-addobserver
// https://docs.rs/objc2-foundation/0.2.2/objc2_foundation/struct.NSNotificationCenter.html#method.addObserver_selector_name_object

use objc2_app_kit::NSWorkspace;

pub fn run() {
    let workspace = unsafe { NSWorkspace::sharedWorkspace() };
    let _nc = unsafe { workspace.notificationCenter() };

    // nc.addObserver_selector_name_object(observer, a_selector, a_name, an_object);
}
