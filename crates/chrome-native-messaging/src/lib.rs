use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::path::PathBuf;

pub mod manifest;
pub mod message;

pub use manifest::*;
pub use message::*;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Home directory not found")]
    HomeDirNotFound,
}

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ExtensionMessage {
    MuteStateChanged { muted: bool },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum HostMessage {
    Ack,
}

pub fn read_message<R: Read>(reader: &mut R) -> Result<Option<ExtensionMessage>> {
    let mut length_bytes = [0u8; 4];
    match reader.read_exact(&mut length_bytes) {
        Ok(_) => {}
        Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e.into()),
    }

    let length = u32::from_ne_bytes(length_bytes) as usize;
    let mut buffer = vec![0u8; length];
    reader.read_exact(&mut buffer)?;

    let message: ExtensionMessage = serde_json::from_slice(&buffer)?;
    Ok(Some(message))
}

pub fn write_message<W: Write>(writer: &mut W, message: &HostMessage) -> Result<()> {
    let json = serde_json::to_vec(message)?;
    let length = json.len() as u32;
    writer.write_all(&length.to_ne_bytes())?;
    writer.write_all(&json)?;
    writer.flush()?;
    Ok(())
}
