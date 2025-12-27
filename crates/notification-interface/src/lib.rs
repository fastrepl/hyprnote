#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum NotificationEvent {
    Confirm,
    Accept,
    Dismiss,
    Timeout,
}

#[derive(Debug, Clone)]
pub struct NotificationContext {
    pub key: String,
    pub event_id: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Notification {
    pub key: Option<String>,
    pub title: String,
    pub message: String,
    pub timeout: Option<std::time::Duration>,
    pub event_id: Option<String>,
}

impl Notification {
    pub fn builder() -> NotificationBuilder {
        NotificationBuilder::default()
    }
}

#[derive(Default)]
pub struct NotificationBuilder {
    key: Option<String>,
    title: Option<String>,
    message: Option<String>,
    timeout: Option<std::time::Duration>,
    event_id: Option<String>,
}

impl NotificationBuilder {
    pub fn key(mut self, key: impl Into<String>) -> Self {
        self.key = Some(key.into());
        self
    }

    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    pub fn message(mut self, message: impl Into<String>) -> Self {
        self.message = Some(message.into());
        self
    }

    pub fn timeout(mut self, timeout: std::time::Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }

    pub fn event_id(mut self, event_id: impl Into<String>) -> Self {
        self.event_id = Some(event_id.into());
        self
    }

    pub fn build(self) -> Notification {
        Notification {
            key: self.key,
            title: self.title.unwrap(),
            message: self.message.unwrap(),
            timeout: self.timeout,
            event_id: self.event_id,
        }
    }
}
