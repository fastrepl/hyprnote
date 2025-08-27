use crate::error::Error;

pub struct DetectState {
    tx: Option<std::sync::mpsc::Sender<hypr_detect::DetectEvent>>,
    handle: Option<std::thread::JoinHandle<()>>,
    detector: Option<hypr_detect::Detector>,
    app_handle: tauri::AppHandle<tauri::Wry>,
}

impl DetectState {
    pub fn new(app_handle: tauri::AppHandle<tauri::Wry>) -> Self {
        Self {
            tx: None,
            handle: None,
            detector: None,
            app_handle,
        }
    }

    pub fn start(&mut self) -> Result<(), Error> {
        self.stop()?;

        let (tx, rx) = std::sync::mpsc::channel::<hypr_detect::DetectEvent>();

        let app_handle = self.app_handle.clone();
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
                                    .message("Based on your microphone activity")
                                    .url("hypr://hyprnote.com/app/new?record=true")
                                    .timeout(std::time::Duration::from_secs(30))
                                    .build(),
                            );
                        }
                    }
                    hypr_detect::DetectEvent::MicStopped => {}
                    _ => {}
                }
            }
        });

        let mut detector = hypr_detect::Detector::default();
        let tx_clone = tx.clone();
        detector.start(hypr_detect::new_callback(move |e| {
            let _ = tx_clone.send(e);
        }));

        self.tx = Some(tx);
        self.handle = Some(handle);
        self.detector = Some(detector);

        Ok(())
    }

    pub fn stop(&mut self) -> Result<(), Error> {
        if let Some(mut detector) = self.detector.take() {
            detector.stop();
        }

        self.tx = None;

        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }

        Ok(())
    }

    pub fn _is_running(&self) -> bool {
        self.detector.is_some() && self.handle.is_some()
    }
}

impl Drop for DetectState {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}
