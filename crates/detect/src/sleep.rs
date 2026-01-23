use std::sync::atomic::Ordering;
use std::time::Duration;

use block2::RcBlock;
use objc2::{msg_send, rc::Retained};
use objc2_app_kit::NSWorkspace;
use objc2_foundation::{NSNotification, NSNotificationCenter, NSObject, NSString};

use crate::{BackgroundTask, DetectCallback, DetectEvent};

struct SleepObserver {
    center: Retained<NSNotificationCenter>,
    will_sleep_observer: Retained<NSObject>,
    did_wake_observer: Retained<NSObject>,
}

impl Drop for SleepObserver {
    fn drop(&mut self) {
        unsafe {
            let _: () = msg_send![&*self.center, removeObserver: &*self.will_sleep_observer];
            let _: () = msg_send![&*self.center, removeObserver: &*self.did_wake_observer];
        }
    }
}

#[derive(Default)]
pub struct SleepDetector {
    background: BackgroundTask,
}

impl crate::Observer for SleepDetector {
    fn start(&mut self, f: DetectCallback) {
        if self.background.is_running() {
            return;
        }

        self.background.start(|running, mut rx| async move {
            let will_sleep_callback = f.clone();
            let will_sleep_block = RcBlock::new(move |_notification: *const NSNotification| {
                will_sleep_callback(DetectEvent::SleepStateChanged { value: true });
            });

            let did_wake_callback = f.clone();
            let did_wake_block = RcBlock::new(move |_notification: *const NSNotification| {
                did_wake_callback(DetectEvent::SleepStateChanged { value: false });
            });

            let observer = unsafe {
                let workspace = NSWorkspace::sharedWorkspace();
                let center = workspace.notificationCenter();

                let will_sleep_name = NSString::from_str("NSWorkspaceWillSleepNotification");
                let did_wake_name = NSString::from_str("NSWorkspaceDidWakeNotification");

                let will_sleep_observer: Retained<NSObject> = msg_send![
                    &*center,
                    addObserverForName: &*will_sleep_name,
                    object: std::ptr::null::<NSObject>(),
                    queue: std::ptr::null::<NSObject>(),
                    usingBlock: &*will_sleep_block
                ];

                let did_wake_observer: Retained<NSObject> = msg_send![
                    &*center,
                    addObserverForName: &*did_wake_name,
                    object: std::ptr::null::<NSObject>(),
                    queue: std::ptr::null::<NSObject>(),
                    usingBlock: &*did_wake_block
                ];

                SleepObserver {
                    center,
                    will_sleep_observer,
                    did_wake_observer,
                }
            };

            loop {
                tokio::select! {
                    _ = &mut rx => break,
                    _ = tokio::time::sleep(Duration::from_millis(500)) => {
                        if !running.load(Ordering::SeqCst) {
                            break;
                        }
                    }
                }
            }

            drop(observer);
        });
    }

    fn stop(&mut self) {
        self.background.stop();
    }
}
