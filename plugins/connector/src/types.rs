#[derive(Debug, serde::Deserialize, serde::Serialize, specta::Type)]
pub struct Connection {
    pub api_base: String,
    pub api_key: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, specta::Type)]
#[serde(tag = "type", content = "connection")]
pub enum ConnectionLLM {
    HyprCloud(Connection),
    HyprLocal(Connection),
    Custom(Connection),
}

impl From<ConnectionLLM> for Connection {
    fn from(value: ConnectionLLM) -> Self {
        match value {
            ConnectionLLM::HyprCloud(conn) => conn,
            ConnectionLLM::HyprLocal(conn) => conn,
            ConnectionLLM::Custom(conn) => conn,
        }
    }
}

impl AsRef<Connection> for ConnectionLLM {
    fn as_ref(&self) -> &Connection {
        match self {
            ConnectionLLM::HyprCloud(conn) => conn,
            ConnectionLLM::HyprLocal(conn) => conn,
            ConnectionLLM::Custom(conn) => conn,
        }
    }
}
