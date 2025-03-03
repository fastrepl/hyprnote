use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("calendar access denied")]
    CalendarAccessDenied,
    #[error("contacts access denied")]
    ContactsAccessDenied,
    #[error("database error: {0}")]
    DatabaseError(#[from] hypr_db_user::Error),
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
