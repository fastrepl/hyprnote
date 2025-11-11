use std::sync::Arc;
use tokio::sync::RwLock;

use super::ChannelMode;

pub type LiveContextHandle = Arc<LiveContext>;

pub struct LiveContext {
    snapshot: RwLock<LiveSnapshot>,
}

impl LiveContext {
    pub fn new() -> Self {
        let initial = LiveSnapshot::default();
        Self {
            snapshot: RwLock::new(initial),
        }
    }

    pub async fn read(&self) -> LiveSnapshot {
        self.snapshot.read().await.clone()
    }

    pub async fn write<F>(&self, f: F)
    where
        F: FnOnce(&mut LiveSnapshot),
    {
        let mut guard = self.snapshot.write().await;
        f(&mut guard);
    }
}

impl Default for LiveContext {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct LiveSnapshot {
    pub mode: ChannelMode,
    pub sample_rate: u32,
    pub device_id: Option<String>,
}

impl Default for LiveSnapshot {
    fn default() -> Self {
        Self {
            mode: ChannelMode::Dual,
            sample_rate: 16000,
            device_id: None,
        }
    }
}
