use deno_core::op2;

#[op2]
#[string]
pub fn op_hypr_log(#[string] message: String) -> String {
    tracing::info!(target: "extension", "{}", message);
    "ok".to_string()
}

#[op2]
#[string]
pub fn op_hypr_log_error(#[string] message: String) -> String {
    tracing::error!(target: "extension", "{}", message);
    "ok".to_string()
}

#[op2]
#[string]
pub fn op_hypr_log_warn(#[string] message: String) -> String {
    tracing::warn!(target: "extension", "{}", message);
    "ok".to_string()
}
