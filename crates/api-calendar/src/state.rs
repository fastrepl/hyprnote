use crate::config::CalendarConfig;

#[derive(Clone)]
pub struct AppState {
    pub config: CalendarConfig,
}

impl AppState {
    pub fn new(config: CalendarConfig) -> Self {
        Self { config }
    }
}
