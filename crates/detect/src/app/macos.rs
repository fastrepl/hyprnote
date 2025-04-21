use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use cidre::{blocks, ns, ns::workspace::notification as wsn, objc::Obj};
use tokio::{
    sync::oneshot,
    task::JoinHandle,
    time::{sleep, Duration},
};

// `defaults read /Applications/Hyprnote.app/Contents/Info.plist CFBundleIdentifier`
const MEETING_APP_LIST: [&str; 3] = [
    "us.zoom.xos",         // tested
    "Cisco-Systems.Spark", // tested
    "com.microsoft.teams",
];

pub struct Detector {
    running: Arc<AtomicBool>,
    shutdown_tx: Option<oneshot::Sender<()>>,
    task_handle: Option<JoinHandle<()>>,
}

impl Default for Detector {
    fn default() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            shutdown_tx: None,
            task_handle: None,
        }
    }
}

impl crate::Observer for Detector {
    fn start(&mut self, f: crate::DetectCallback) {
        if self.running.load(Ordering::SeqCst) {
            return;
        }

        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();

        let (tx, mut rx) = oneshot::channel();
        self.shutdown_tx = Some(tx);

        self.task_handle = Some(tokio::spawn(async move {
            let notification_running = running.clone();
            let block = move |n: &ns::Notification| {
                if !notification_running.load(Ordering::SeqCst) {
                    return;
                }

                let user_info = n.user_info().unwrap();

                if let Some(app) = user_info.get(wsn::app_key()) {
                    if let Some(app) = app.try_cast(ns::RunningApp::cls()) {
                        let bundle_id = app.bundle_id().unwrap().to_string();
                        let detected = MEETING_APP_LIST.contains(&bundle_id.as_str());
                        if detected {
                            f(bundle_id);
                        }
                    }
                }
            };

            let mut block = blocks::SyncBlock::new1(block);
            let notifications = [wsn::did_launch_app()];

            let mut observers = Vec::new();
            let mut nc = ns::Workspace::shared().notification_center();

            for name in notifications {
                let observer = nc.add_observer_block(name, None, None, &mut block);
                observers.push(observer);
            }

            loop {
                tokio::select! {
                    _ = &mut rx => {
                        break;
                    }
                    _ = sleep(Duration::from_millis(500)) => {
                        if !running.load(Ordering::SeqCst) {
                            break;
                        }
                    }
                }
            }

            let mut nc = ns::Workspace::shared().notification_center();
            for observer in observers {
                nc.remove_observer(&observer);
            }
        }));
    }

    fn stop(&mut self) {
        if !self.running.load(Ordering::SeqCst) {
            return;
        }

        self.running.store(false, Ordering::SeqCst);

        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }

        self.task_handle.take();
    }
}
