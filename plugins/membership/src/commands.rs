use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::MembershipExt;
use crate::Result;

#[command]
pub(crate) async fn ping<R: Runtime>(
    app: AppHandle<R>,
    payload: PingRequest,
) -> Result<PingResponse> {
    app.membership().ping(payload)
}
