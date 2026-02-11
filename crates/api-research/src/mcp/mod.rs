mod prompts;
mod server;
mod tools;

use crate::config::ResearchConfig;
use crate::state::AppState;

use server::ResearchMcpServer;

pub fn mcp_service(
    config: ResearchConfig,
) -> rmcp::transport::streamable_http_server::StreamableHttpService<ResearchMcpServer> {
    let state = AppState::new(config);

    hypr_mcp::create_service(move || Ok(ResearchMcpServer::new(state.clone())))
}
