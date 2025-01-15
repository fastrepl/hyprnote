// https://developer.apple.com/documentation/appkit/nsworkspace?language=objc
// https://developer.apple.com/documentation/foundation/nsdistributednotificationcenter/1414151-addobserver
// https://docs.rs/objc2-foundation/0.2.2/objc2_foundation/struct.NSNotificationCenter.html#method.addObserver_selector_name_object

// https://github.com/search?q=addObserver_forKeyPath_options_context+language:Rust+&type=code
// https://github.com/search?q=addObserver_selector_name_object+language:Rust+&type=code

use objc2_app_kit::NSWorkspace;
use objc2_foundation::{
    NSKeyValueObservingOptions, NSNotificationCenter, NSObject,
    NSObjectNSKeyValueObserverRegistration, NSString,
};

pub fn run() {
    // https://developer.apple.com/documentation/appkit/nsworkspace/didlaunchapplicationnotification
    let workspace = unsafe { NSWorkspace::sharedWorkspace() };

    unsafe {
        let key = NSString::from_str("didLaunchApplication");
        workspace.addObserver_forKeyPath_options_context(
            // TODO
            &NSObject::new(),
            &key,
            NSKeyValueObservingOptions::NSKeyValueObservingOptionNew,
            std::ptr::null_mut(),
        );
    }

    let _nc = unsafe { NSNotificationCenter::defaultCenter() };
    // nc.addObserver_selector_name_object(observer, a_selector, a_name, an_object);

    let _un = unsafe { objc2_user_notifications::UNUserNotificationCenter::new() };
    // un.requestAuthorizationWithOptions_completionHandler(options, completion_handler);
}
