use crate::{
    handler::{NotificationHandler, NotificationTrigger, NotificationTriggerDetect},
    Error,
};

pub struct DetectState {
    detector: Option<hypr_detect::Detector>,
    notification_tx: Option<std::sync::mpsc::Sender<NotificationTrigger>>,
}

impl DetectState {
    pub fn new(notification_handler: &NotificationHandler) -> Self {
        Self {
            detector: None,
            notification_tx: notification_handler.sender(),
        }
    }

    pub fn start(&mut self) -> Result<(), Error> {
        self.stop()?;

        {
            let notification_tx = self.notification_tx.as_ref().unwrap().clone();
            let mut detector = hypr_detect::Detector::default();

            detector.start(hypr_detect::new_callback(move |event| {
                if let Err(e) =
                    notification_tx.send(NotificationTrigger::Detect(NotificationTriggerDetect {
                        event,
                        timestamp: std::time::SystemTime::now(),
                    }))
                {
                    tracing::error!("{}", e);
                }
            }));
            self.detector = Some(detector);
        }

        Ok(())
    }

    pub fn stop(&mut self) -> Result<(), Error> {
        if let Some(mut detector) = self.detector.take() {
            detector.stop();
        }

        Ok(())
    }

    pub fn _is_running(&self) -> bool {
        self.detector.is_some()
    }
}

impl Drop for DetectState {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}
