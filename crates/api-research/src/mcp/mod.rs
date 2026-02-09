mod server;
mod tools;

use rmcp::transport::streamable_http_server::{
    StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
};

use crate::config::ResearchConfig;
use crate::state::AppState;

use server::ResearchMcpServer;

pub fn mcp_service(config: ResearchConfig) -> StreamableHttpService<ResearchMcpServer> {
    let state = AppState::new(config);

    StreamableHttpService::new(
        move || Ok(ResearchMcpServer::new(state.clone())),
        LocalSessionManager::default().into(),
        StreamableHttpServerConfig::default(),
    )
}
