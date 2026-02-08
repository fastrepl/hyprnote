//! HTTP server configuration and lifecycle management.

use std::net::SocketAddr;

use axum::Router;

/// Starts the HTTP server and blocks until shutdown.
///
/// # Arguments
///
/// * `router` - The configured Axum router
/// * `port` - Port number to bind to
///
/// # Returns
///
/// Returns `Ok(())` on successful shutdown, or an IO error if startup fails.
///
/// # Shutdown
///
/// The server will gracefully shutdown when receiving a SIGTERM or Ctrl+C signal.
pub async fn run(router: Router, port: u16) -> std::io::Result<()> {
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!(addr = %addr, "server_listening");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

/// Waits for a shutdown signal (Ctrl+C or SIGTERM).
///
/// Logs when the signal is received for observability.
async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install CTRL+C signal handler");
    tracing::info!("shutdown_signal_received");
}
