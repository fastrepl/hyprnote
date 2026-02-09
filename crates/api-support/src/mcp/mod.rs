mod prompts;
mod server;
mod tools;

use rmcp::transport::streamable_http_server::{
    StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
};

use crate::state::AppState;

use server::SupportMcpServer;

pub(crate) fn mcp_service(state: AppState) -> StreamableHttpService<SupportMcpServer> {
    StreamableHttpService::new(
        move || Ok(SupportMcpServer::new(state.clone())),
        LocalSessionManager::default().into(),
        StreamableHttpServerConfig::default(),
    )
}
