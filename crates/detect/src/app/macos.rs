use cidre::{blocks, ns, ns::workspace::notification as wsn, objc::Obj};
use tokio::time::{sleep, Duration};

use crate::BackgroundTask;

enum AppEvent {
    Launched(String),
    Terminated(String),
}

impl AppEvent {
    fn to_string(&self) -> String {
        match self {
            AppEvent::Launched(bundle_id) => format!("app_launched:{}", bundle_id),
            AppEvent::Terminated(bundle_id) => format!("app_terminated:{}", bundle_id),
        }
    }
}

// `defaults read /Applications/Hyprnote.app/Contents/Info.plist CFBundleIdentifier`
const MEETING_APP_LIST: [&str; 20] = [
    "us.zoom.xos",                                            // Zoom - tested
    "Cisco-Systems.Spark",                                    // Cisco Webex - tested
    "com.microsoft.teams",                                    // Microsoft Teams - tested
    "com.google.Chrome",                                      // Google Chrome
    "com.apple.Safari",                                       // Safari
    "com.microsoft.VSCode",                                   // Visual Studio Code
    "com.skype.skype",                                        // Skype
    "com.google.Chrome.app.kjgfgldnnfoeklkmfkjfagphfepbbdan", // Google Meet
    "com.apple.FaceTime",                                     // FaceTime
    "com.discord.Discord",                                    // Discord
    "com.slack.Slack",                                        // Slack
    "com.microsoft.teams2",                                   // Microsoft Teams (New)
    "com.facebook.Messenger",                                 // Facebook Messenger
    "com.whatsapp.WhatsApp",                                  // WhatsApp
    "com.gotomeeting.GoToMeeting",                            // GoToMeeting
    "com.logmein.GoToWebinar",                                // GoToWebinar
    "com.ringcentral.RingCentral",                            // RingCentral
    "com.bluejeans.bluejeans",                                // BlueJeans
    "com.8x8.meet",                                           // 8x8 Meet
    "com.jitsi.meet",                                         // Jitsi Meet
];

pub struct Detector {
    background: BackgroundTask,
}

impl Default for Detector {
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
        }
    }
}

impl crate::Observer for Detector {
    fn start(&mut self, f: crate::DetectCallback) {
        self.background.start(|running, mut rx| async move {
            let notification_running = running.clone();
            let f_clone = f.clone();
            let block = move |n: &ns::Notification| {
                if !notification_running.load(std::sync::atomic::Ordering::SeqCst) {
                    return;
                }

                let notification_name = n.name().to_string();
                let user_info = n.user_info().unwrap();

                if let Some(app) = user_info.get(wsn::app_key()) {
                    if let Some(app) = app.try_cast(ns::RunningApp::cls()) {
                        let bundle_id = app.bundle_id().unwrap().to_string();
                        let detected = MEETING_APP_LIST.contains(&bundle_id.as_str());
                        if detected {
                            let event = if notification_name.contains("DidLaunch") {
                                AppEvent::Launched(bundle_id)
                            } else if notification_name.contains("DidTerminate") {
                                AppEvent::Terminated(bundle_id)
                            } else {
                                return;
                            };
                            f_clone(event.to_string());
                        }
                    }
                }
            };

            let mut block = blocks::SyncBlock::new1(block);
            let notifications = [wsn::did_launch_app(), wsn::did_terminate_app()];

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
                        if !running.load(std::sync::atomic::Ordering::SeqCst) {
                            break;
                        }
                    }
                }
            }

            let mut nc = ns::Workspace::shared().notification_center();
            for observer in observers {
                nc.remove_observer(&observer);
            }
        });
    }

    fn stop(&mut self) {
        self.background.stop();
    }
}
