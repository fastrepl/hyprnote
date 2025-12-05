use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_util::sync::CancellationToken;

#[derive(Clone)]
pub struct ConnectionManager {
    token: Arc<RwLock<Option<CancellationToken>>>,
}

impl Default for ConnectionManager {
    fn default() -> Self {
        Self {
            token: Arc::new(RwLock::new(None)),
        }
    }
}

impl ConnectionManager {
    pub async fn acquire_connection(&self) -> ConnectionGuard {
        let mut slot = self.token.write().await;

        if let Some(old) = slot.take() {
            old.cancel();
        }

        let token = CancellationToken::new();
        *slot = Some(token.clone());

        ConnectionGuard { token }
    }

    pub async fn cancel_all(&self) {
        let mut slot = self.token.write().await;
        if let Some(token) = slot.take() {
            token.cancel();
        }
    }
}

pub struct ConnectionGuard {
    token: CancellationToken,
}

impl ConnectionGuard {
    pub fn is_cancelled(&self) -> bool {
        self.token.is_cancelled()
    }

    pub async fn cancelled(&self) {
        self.token.cancelled().await
    }

    pub fn child_token(&self) -> CancellationToken {
        self.token.child_token()
    }
}
