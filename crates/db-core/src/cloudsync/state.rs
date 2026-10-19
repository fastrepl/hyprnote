use tokio::sync::oneshot;
use tokio::task::JoinHandle;

use super::types::CloudsyncActivityStatus;
use super::{CloudsyncNetworkResult, CloudsyncRuntimeConfig};

#[derive(Default, Debug)]
pub(crate) struct CloudsyncRuntimeState {
    pub(crate) config: Option<CloudsyncRuntimeConfig>,
    pub(crate) running: bool,
    pub(crate) network_initialized: bool,
    pub(crate) task: Option<CloudsyncBackgroundTask>,
    pub(crate) last_sync: Option<CloudsyncNetworkResult>,
    pub(crate) last_sync_at_ms: Option<u64>,
    pub(crate) outbound_work_state: Option<bool>,
    pub(crate) last_error: Option<String>,
    pub(crate) last_error_kind: Option<anlg_cloudsync::ErrorKind>,
    pub(crate) consecutive_failures: u32,
    pub(crate) last_logged_activity: Option<CloudsyncActivityStatus>,
    pub(crate) out_of_sync_stall: Option<OutOfSyncStall>,
}

/// Server version an `out-of-sync` send has been stuck at, and since when.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct OutOfSyncStall {
    pub(crate) server_version: i64,
    pub(crate) since_ms: u64,
}

#[derive(Debug)]
pub(crate) struct CloudsyncBackgroundTask {
    pub(crate) shutdown_tx: Option<oneshot::Sender<()>>,
    pub(crate) join_handle: JoinHandle<()>,
}
