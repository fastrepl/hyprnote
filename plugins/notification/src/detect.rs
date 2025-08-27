pub struct DetectState {
    tx: std::sync::mpsc::Sender<hypr_detect::DetectEvent>,
    handle: Option<std::thread::JoinHandle<()>>,
    detector: hypr_detect::Detector,
}

impl DetectState {
    pub fn new(app_handle: tauri::AppHandle<tauri::Wry>) -> Self {
        let (tx, rx) = std::sync::mpsc::channel::<hypr_detect::DetectEvent>();

        let handle = std::thread::spawn(move || {
            while let Ok(event) = rx.recv() {
                match event {
                    hypr_detect::DetectEvent::MicStarted => {
                        let visible = {
                            use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};
                            app_handle
                                .window_is_visible(HyprWindow::Main)
                                .unwrap_or(false)
                        };

                        if !visible {
                            hypr_notification::show(
                                &hypr_notification::Notification::builder()
                                    .title("Meeting detected")
                                    .message("Click here to start writing a note")
                                    .url("hypr://hyprnote.com/notification")
                                    .timeout(std::time::Duration::from_secs(10))
                                    .build(),
                            );
                        }
                    }
                    _ => {}
                }
            }
        });

        Self {
            tx,
            handle: Some(handle),
            detector: hypr_detect::Detector::default(),
        }
    }

    pub fn start(&mut self) {
        let tx = self.tx.clone();
        self.detector.start(hypr_detect::new_callback(move |e| {
            let _ = tx.send(e);
        }));
    }

    pub fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}
