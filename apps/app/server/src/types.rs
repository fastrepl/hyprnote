use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    DatabaseError(#[from] hypr_db_core::Error),
    #[error(transparent)]
    NangoError(#[from] hypr_nango::Error),
    #[error(transparent)]
    TursoError(#[from] hypr_turso::Error),
    #[error(transparent)]
    CalendarError(#[from] hypr_calendar_interface::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

impl Error {
    pub fn as_worker_error(&self) -> apalis::prelude::Error {
        apalis::prelude::Error::Failed(std::sync::Arc::new(Box::new(std::io::Error::new(
            std::io::ErrorKind::Other,
            self.to_string(),
        ))))
    }
}
