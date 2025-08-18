use tokio::sync::mpsc;

#[derive(Debug, Clone)]
pub enum TuiEvent {
    DeviceChanged(String),
    Quit,
}

pub type TuiEventSender = mpsc::UnboundedSender<TuiEvent>;
pub type TuiEventReceiver = mpsc::UnboundedReceiver<TuiEvent>;

pub fn create_event_channel() -> (TuiEventSender, TuiEventReceiver) {
    mpsc::unbounded_channel()
}
