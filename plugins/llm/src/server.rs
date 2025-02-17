use crate::State;
use axum::{extract::State as AxumState, response::Json, routing::get, Router};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;

type SharedState = Arc<Mutex<State>>;

pub async fn run_server(state: SharedState) -> anyhow::Result<()> {
    // Build router with routes
    // let app = Router::new()
    //     .route("/health", get(health_check))
    //     .with_state(state.clone());

    // // Bind to localhost on a random port
    // let addr = SocketAddr::from(([127, 0, 0, 1], 0));
    // let listener = tokio::net::TcpListener::bind(addr).await?;
    // let server_addr = listener.local_addr()?;

    // // Store the server address in state
    // {
    //     let mut state = state.lock().await;
    //     state.server_addr = Some(server_addr);
    // }

    // tracing::info!("LLM server listening on {}", server_addr);

    // // Start the server
    // axum::serve(listener, app).await?;

    Ok(())
}

// Health check endpoint
async fn health_check(AxumState(state): AxumState<SharedState>) -> Json<String> {
    let state = state.lock().await;
    Json(format!("status: ok, loaded: {}", state.loaded))
}
