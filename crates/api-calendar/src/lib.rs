mod config;
mod error;
mod routes;
mod state;

pub use config::CalendarConfig;
pub use error::{CalendarError, Result};
pub use routes::{openapi, router};
pub use state::AppState;
